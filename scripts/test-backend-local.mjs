import assert from 'node:assert/strict';

// Fixed addresses and .test accounts ensure this mutating suite only targets the disposable runtime.
const base = 'http://127.0.0.1:8080/api';
const inbox = 'http://127.0.0.1:8081/mail';
const password = 'WordWeftLocal123!';
const runId = Date.now().toString(36);
// Give each local run its own rate limit bucket, independent of simultaneous browser checks.
const rateLimitAddress = `127.1.${Math.floor(Date.now() / 1000) % 254 + 1}.${Date.now() % 254 + 1}`;
const email = `test-${runId}@example.test`;
const username = `test${runId}`;
let requests = 0;
let assertions = 0;
let createdBook;
let writer;
let communityPost;

async function api(path, { token, body, method = body === undefined ? 'GET' : 'POST', status = 200 } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Forwarded-For': rateLimitAddress,
    },
    ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }),
    signal: AbortSignal.timeout(15_000),
  });
  requests++;
  const raw = await response.text();
  let data = raw;
  try { data = raw ? JSON.parse(raw) : null; } catch { /* Plain text auth messages are valid. */ }
  assert.equal(response.status, status, `${method} ${path}: expected ${status}, got ${response.status}: ${raw.slice(0, 500)}`);
  assertions++;
  return data;
}

function check(condition, description) {
  assert.ok(condition, description);
  assertions++;
}

async function login(address) {
  const response = await api('/auth/login', { body: { email: address, password } });
  check(Boolean(response.token), `${address} receives a signed session`);
  return response.token;
}

async function capturedMail(subject) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const response = await fetch(inbox, { signal: AbortSignal.timeout(5_000) });
    const mail = await response.json();
    const message = mail.findLast(item => item.to === email && item.subject.toLowerCase().includes(subject.toLowerCase()));
    if (message) return message;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Local email capture did not receive ${subject} for ${email}`);
}

try {
  check((await fetch(inbox)).ok, 'Local email capture is running');
  const catalog = await api('/books?size=12');
  const catalogBooks = Array.isArray(catalog) ? catalog : catalog.books || catalog.content;
  check(catalogBooks?.some(book => book.id === 'local-story-spring'), 'Local fixture catalog is present');
  check((await api('/search?q=Bellweather&type=books')).books.items.some(book => book.id === 'local-story-spring'), 'Search returns the seeded story');
  check((await api('/search/autocomplete?q=Bellweather')).books.some(book => book.id === 'local-story-spring'), 'Autocomplete finds a word inside the seeded story title without Atlas Search');
  check((await api('/search/autocomplete?q=Mira')).authors.some(author => author.id === 'local-writer'), 'Author autocomplete returns the seeded writer');
  await api('/users/me', { status: 401 });
  await api('/auth/login', { body: { email: 'reader@example.test', password: 'incorrect-password' }, status: 401 });
  const reader = await login('reader@example.test');
  writer = await login('writer@example.test');
  const admin = await login('admin@example.test');
  check((await api('/users/me', { token: reader })).id === 'local-reader', 'Session hydrates the real reader profile');
  const originalPreferences = (await api('/users/me', { token: reader })).notificationPreferences;
  const changedPreferences = { ...originalPreferences, follows: !originalPreferences.follows };
  await api('/users/preferences', { token: reader, method: 'PUT', body: changedPreferences });
  check((await api('/users/me', { token: reader })).notificationPreferences.follows === changedPreferences.follows, 'Notification preferences persist through the endpoint used by the application');
  await api('/users/preferences', { token: reader, method: 'PUT', body: originalPreferences });
  console.log('PASS catalog, protected routes, invalid credentials, and real reader/writer/admin sessions');

  const signup = await api('/auth/signup', { body: { username, email, password, dateOfBirth: '1995-04-12' } });
  check(signup.requiresOtp, 'Registration requires email verification');
  await api('/auth/login', { body: { email, password }, status: 403 });
  const otpMessage = await capturedMail('Verification');
  const otp = otpMessage.htmlBody.match(/>\s*(\d{6})\s*</)?.[1];
  check(Boolean(otp), 'The local inbox contains the real generated OTP');
  await api('/auth/verify-otp', { body: { email, otp: 'nototp' }, status: 400 });
  const verified = await api('/auth/verify-otp', { body: { email, otp } });
  check(Boolean(verified.token), 'Verifying the generated OTP establishes a real session');
  const registered = verified.token;
  await api('/users/profile', { method: 'PUT', token: registered, body: { bio: 'A local integration test reader.', location: 'Test village', favoriteGenres: ['Fantasy'] } });
  check((await api('/users/me', { token: registered })).bio === 'A local integration test reader.', 'Profile updates persist');
  await api('/auth/forgot-password', { body: { email } });
  const resetMail = await capturedMail('Reset');
  const resetToken = resetMail.htmlBody.match(/token=([a-f0-9-]+)/)?.[1];
  check(Boolean(resetToken), 'Password reset produces a real token in captured local mail');
  await api('/auth/reset-password', { body: { token: resetToken, newPassword: 'ChangedLocal123!' } });
  check(Boolean((await api('/auth/login', { body: { email, password: 'ChangedLocal123!' } })).token), 'Password reset is accepted by authentication');
  await api('/auth/reset-password', { body: { token: resetToken, newPassword: 'ChangedAgain123!' }, status: 400 });
  console.log('PASS registration, OTP verification, profile persistence, password reset, and token reuse rejection');

  const storyId = 'local-story-spring';
  const chapterId = `${storyId}-chapter-1`;
  const first = await api(`/books/${storyId}/chapters/${chapterId}/content`);
  check(first.access === 'PREVIEW' && first.obfuscated, 'Anonymous reading receives an obfuscated preview');
  await api(`/books/${storyId}/chapters/${storyId}-chapter-2/content`, { status: 401 });
  const full = await api(`/books/${storyId}/chapters/${chapterId}/content`, { token: reader });
  check(full.access === 'FULL' && full.fullWordCount >= 300, 'Authenticated readers receive full chapter access');
  await api('/books/local-story-draft', { token: reader, status: 404 });
  await api(`/books/${storyId}/chapters/${chapterId}/content?mode=edit`, { token: reader, status: 403 });
  const editable = await api(`/books/${storyId}/chapters/${chapterId}/content?mode=edit`, { token: writer });
  check(!editable.obfuscated && editable.content.includes('June'), 'Author edit content remains pristine');
  await api('/reading/progress', { token: registered, body: { bookId: storyId, scrollPosition: 200, chapterData: { id: chapterId, progress: 95, scroll: 200 } } });
  check((await api(`/reading/progress/${storyId}`, { token: registered })).chapters[chapterId].progress === 95, 'Reading position persists');
  await api('/library/shelves', { token: registered, body: { name: 'Integration bookshelf' } });
  const shelves = await api('/library/shelves', { token: registered });
  const shelf = shelves.find(item => item.name === 'Integration bookshelf');
  check(Boolean(shelf?.id), 'Custom bookshelf persists');
  const shelved = await api(`/library/books/${storyId}/shelves`, { token: registered, body: { shelfIds: [shelf.id] } });
  check(shelved.library.some(item => item.name === 'Integration bookshelf' && item.books.some(book => book.id === storyId)), 'Story is assigned to the custom shelf');
  const comment = await api(`/books/${storyId}/chapters/${chapterId}/comments`, { token: registered, body: { content: 'The opening feels quietly magical.', paragraphIndex: 2 } });
  check(comment.paragraphIndex === 2, 'Paragraph discussion retains its anchor');
  const reviews = await api(`/books/${storyId}/reviews`, { token: registered, body: { rating: 5, comment: 'A thoughtful and atmospheric opening.' } });
  check(reviews.some(review => review.comment.includes('thoughtful')), 'Reader review persists');
  const editedReviews = await api(`/books/${storyId}/reviews`, { token: registered, body: { rating: 4, comment: 'A thoughtful opening, with an updated rating.' } });
  check(editedReviews.filter(review => review.userId === verified.id).length === 1, 'Editing a review preserves one review per reader');
  await api('/users/local-writer/follow', { token: registered, body: {} });
  check((await api('/users/local-writer/followers', { token: writer })).some(member => member.id === verified.id), 'Follow relationship persists');
  await api('/users/local-writer/unfollow', { token: registered, body: {} });
  console.log('PASS anonymous preview, reader access, owner access, progress, shelves, paragraph comments, reviews, and follows');

  const title = `Local integration story ${runId}`;
  const authorProfile = await api('/books', { token: writer, body: { title, summary: 'A local-only story used to test the publishing lifecycle.', genres: ['Fantasy'], category: 'Novel', coverUrl: 'http://localhost:3000/design-v2/assets/met-53681.jpg' } });
  const created = authorProfile.writtenBooks.find(book => book.title === title);
  check(created?.publicationStatus === 'draft', 'Creating a story begins as a draft');
  createdBook = created.id;
  await api(`/books/${createdBook}`, { token: reader, method: 'PATCH', body: { title: 'Unauthorized edit' }, status: 403 });
  await api(`/books/${createdBook}`, { token: writer, method: 'PATCH', body: { summary: 'Updated local story description.', readingStatus: 'Ongoing' } });
  let updated = await api(`/books/${createdBook}/chapters/new`, { token: writer, method: 'PATCH', body: { data: { title: 'The Open Gate', content: '<p>June arrived at the garden after the rain. Everything she remembered was waiting, but nothing was quite the same.</p>' }, status: 'draft' } });
  let draftStory = updated.writtenBooks.find(book => book.id === createdBook);
  const chapter = draftStory.chapters[0];
  check(chapter.status === 'draft' && chapter.wordCount > 0, 'Chapter save persists a draft and its word count');
  updated = await api(`/books/${createdBook}/status`, { token: writer, method: 'PATCH', body: { status: 'published', chapterIds: [chapter.id] } });
  check(updated.writtenBooks.find(book => book.id === createdBook).publicationStatus === 'published', 'Story publication persists');
  check((await api(`/books/${createdBook}`, { token: reader })).chapters[0].title === 'The Open Gate', 'Published story appears to readers');
  await api(`/books/${createdBook}/chapters/${chapter.id}`, { token: writer, method: 'PATCH', body: { data: { title: 'Private Revision', content: '<p>A changed opening that the author is still revising.</p>' }, status: 'preserve' } });
  check((await api(`/books/${createdBook}`, { token: reader })).chapters[0].title === 'The Open Gate', 'Private edits preserve the released title');
  const revisions = await api(`/books/${createdBook}/chapters/${chapter.id}/revisions`, { token: writer });
  check(revisions.length > 0, 'Saving a released chapter captures revision history');
  const restored = await api(`/books/${createdBook}/chapters/${chapter.id}/revisions/${revisions[0].id}/restore`, { token: writer, body: {} });
  check(restored.writtenBooks.find(book => book.id === createdBook).chapters[0].status === 'draft', 'Restoring a revision returns its chapter to draft for review');
  await api(`/books/${createdBook}/chapters/${chapter.id}/status`, { token: writer, method: 'PATCH' });
  updated = await api(`/books/${createdBook}/chapters/new`, { token: writer, method: 'PATCH', body: { data: { title: 'The Second Letter', content: '<p>The second letter arrived before morning, carrying a question June had been avoiding.</p>' }, status: 'draft' } });
  const next = updated.writtenBooks.find(book => book.id === createdBook).chapters[1];
  updated = await api(`/books/${createdBook}/chapters/${next.id}/schedule`, { token: writer, method: 'PUT', body: { scheduledAt: new Date(Date.now() + 300_000).toISOString() } });
  check(updated.writtenBooks.find(book => book.id === createdBook).chapters[1].status === 'scheduled', 'Scheduling stores the future release');
  check((await api(`/books/${createdBook}`, { token: reader })).chapters.length === 1, 'Scheduled chapters stay hidden from readers');
  await api(`/books/${createdBook}/chapters/${next.id}/schedule`, { token: writer, method: 'DELETE' });
  updated = await api(`/books/${createdBook}/chapters/${next.id}/status`, { token: writer, method: 'PATCH' });
  check(updated.writtenBooks.find(book => book.id === createdBook).chapters[1].status === 'published', 'Publish now releases the next chapter');
  const analytics = await api(`/writer/analytics?bookId=${createdBook}`, { token: writer });
  check(Boolean(analytics), 'Writer analytics loads for the created story');
  await api(`/books/${createdBook}`, { token: writer, method: 'PATCH', body: { ageRating: 'MATURE_18' } });
  await api(`/books/${createdBook}`, { token: registered, status: 403 });
  await api(`/books/${createdBook}/chapters/${chapter.id}/content`, { token: registered, status: 403 });
  await api('/users/profile', { token: registered, method: 'PUT', body: { allowMatureContent: true } });
  check((await api(`/books/${createdBook}/chapters/${chapter.id}/content`, { token: registered })).access === 'FULL', 'Eligible readers can opt in to mature story access');
  await api(`/books/${createdBook}`, { token: writer, method: 'PATCH', body: { ageRating: 'ALL_AGES' } });
  console.log('PASS story creation, ownership, draft save, publication, release snapshots, revisions, scheduling, cancellation, and publish now');
  console.log('PASS mature story restrictions and eligible reader opt in');

  const character = await api('/characters', { token: writer, body: { bookId: createdBook, name: 'June Bell', role: 'Protagonist', description: 'A traveler returning home.', goal: 'Read the letter.' } });
  check((await api(`/characters/book/${createdBook}`, { token: writer })).some(item => item.id === character.id), 'Character planning persists');
  const note = await api('/notes', { token: writer, body: { bookId: createdBook, title: 'The garden', content: 'Use the garden as a memory of home.' } });
  const scene = await api('/scenes', { token: writer, body: { bookId: createdBook, title: 'Arrival', setting: 'Village lane', chapterId: chapter.id, characterIds: [character.id] } });
  check(Boolean(note.id && scene.id), 'Notes and scene planning persist');
  const manuscript = new FormData();
  manuscript.append('file', new Blob(['# Chapter 1: A New Beginning\n\nJune found the first letter at the garden gate.\n\n# Chapter 2: The Answer\n\nThe answer waited in the quiet house.'], { type: 'text/plain' }), 'local-manuscript.md');
  const imported = await api(`/books/${createdBook}/import`, { token: writer, body: manuscript });
  check(imported.result.importedChapters === 2 && imported.user.writtenBooks.find(book => book.id === createdBook).chapters.length === 4, 'Text manuscript import creates two draft chapters');
  const image = new FormData();
  image.append('file', new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])], { type: 'image/png' }), 'local.png');
  await api(`/books/${createdBook}/chapters/images`, { token: writer, body: image, status: 503 });
  console.log('PASS planning tools and manuscript import; unconfigured R2 correctly reports unavailable');

  const circles = await api('/community/circles', { token: registered });
  check(circles.length >= 4, 'Official circles load from MongoDB');
  await api('/community/circles/circle-general/membership', { token: registered, method: 'PUT', body: { joined: true } });
  const post = await api('/community/posts', { token: writer, body: { circleId: 'circle-general', type: 'POLL', title: `A local poll ${runId}`, body: 'Which place would you explore first?', pollOptions: ['The garden', 'The quiet house'] }, status: 201 });
  communityPost = post.id;
  await api(`/community/posts/${post.id}/like`, { token: registered, method: 'PUT', body: { active: true } });
  await api(`/community/posts/${post.id}/save`, { token: registered, method: 'PUT', body: { active: true } });
  const vote = await api(`/community/posts/${post.id}/vote`, { token: registered, body: { optionId: post.pollOptions[0].id } });
  check(vote.votedOptionId === post.pollOptions[0].id, 'Poll vote persists');
  const communityComment = await api(`/community/posts/${post.id}/comments`, { token: registered, body: { body: 'The garden sounds wonderful.' }, status: 201 });
  check((await api(`/community/posts/${post.id}/comments`, { token: registered })).items.some(item => item.id === communityComment.id), 'Community comment persists');
  const savedFeed = await api('/community/feed?mode=saved', { token: registered });
  check(savedFeed.items.some(item => item.id === post.id), 'Saved post appears in the member feed');
  await api(`/community/posts/${post.id}/moderate`, { token: registered, body: { action: 'PIN' }, status: 403 });
  check((await api(`/community/posts/${post.id}/moderate`, { token: admin, body: { action: 'PIN' } })).pinned, 'Moderator can pin a discussion');
  await api(`/community/posts/${post.id}/moderate`, { token: admin, body: { action: 'UNPIN' } });
  check((await api('/community/me', { token: admin })).canAdmin, 'Admin capability is granted by role');
  const notifications = await api('/notifications', { token: writer });
  check(notifications.notifications.some(item => item.type === 'COMMUNITY_COMMENT'), 'Comment produces a persisted author notification');
  await api('/notifications/read-all', { token: writer, body: {} });
  check((await api('/growth/challenges/chapter-sprint/join', { token: registered, body: {} })).joined, 'Reading challenge enrollment persists');
  await api('/growth/events');
  await api('/support/grievances', { token: registered, body: { name: username, email, category: 'Technical Issue', subject: 'Local integration check', message: 'A local-only support form check.' } });
  console.log('PASS circles, membership, posts, reactions, polls, comments, saved feed, role enforcement, moderation, notifications, growth, and support');
} finally {
  if (communityPost && writer) await api(`/community/posts/${communityPost}`, { token: writer, method: 'DELETE', status: 204 });
  if (createdBook && writer) await api(`/books/${createdBook}`, { token: writer, method: 'DELETE' });
}
console.log(`Local backend integration passed: ${assertions} assertions across ${requests} API requests, including cleanup.`);
