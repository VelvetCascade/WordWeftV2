// Opt-in integration check against CommunityLocalPreview's isolated database only.
import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:8080/api';
const password = 'CommunityTest123!';
let checks = 0;
async function request(path, { method = 'GET', token, body, status = 200 } = {}) {
  const response = await fetch(`${base}${path}`, { method, signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await response.text();
  assert.equal(response.status, status, `${method} ${path}: ${text}`); checks++;
  return text ? JSON.parse(text) : null;
}
async function login(email) { return (await request('/auth/login', { method: 'POST', body: { email, password } })).token; }
const reader = await login('reader@example.test');
const mod = await login('moderator@example.test');
const author = await login('elara@wordweftstudio.com');
const publicProfile = await request('/users/preview-reader/profile');
assert.equal(publicProfile.id, 'preview-reader'); assert.equal('email' in publicProfile, false); assert.equal('library' in publicProfile, false); checks++;
const circles = await request('/community/circles'); assert.equal(circles.length, 5); checks++;
await request('/community/posts', { method: 'POST', body: {}, status: 401 });
const preferences = await request('/community/me/interests', { token: reader, method: 'PUT', body: { interests: ['READING', 'WEBNOVEL_WRITING', 'CRITIQUE'] } });
assert.equal(preferences.canModerate, false); assert.equal(preferences.interests.length, 3); checks++;
await request('/community/members/preview-reader/badges', { token: reader, method: 'PUT', body: { badges: ['COMMUNITY_MODERATOR'] }, status: 403 });
const join1 = await request('/community/circles/circle-general/membership', { token: reader, method: 'PUT', body: { joined: true } });
const join2 = await request('/community/circles/circle-general/membership', { token: reader, method: 'PUT', body: { joined: true } });
assert.equal(join1.memberCount, join2.memberCount); assert.equal(join2.joined, true); checks++;
const suffix = Date.now();
const post = await request('/community/posts', { token: reader, method: 'POST', status: 201, body: { circleId: 'circle-general', type: 'POLL', title: `Integration poll ${suffix}`, body: '<script>plain text only</script>', pollOptions: ['North', 'South'] } });
assert.equal(post.body, '<script>plain text only</script>'); checks++;
await request(`/community/posts/${post.id}/like`, { token: reader, method: 'PUT', body: { active: true }, status: 400 });
const repeated = await Promise.all(Array.from({ length: 4 }, () => request(`/community/posts/${post.id}/like`, { token: author, method: 'PUT', body: { active: true } })));
assert.equal((await request(`/community/posts/${post.id}`, { token: author })).likeCount, 1); checks++;
await request(`/community/posts/${post.id}/like`, { token: author, method: 'PUT', body: { active: false } });
assert.equal((await request(`/community/posts/${post.id}`)).likeCount, 0); checks++;
await request(`/community/posts/${post.id}/save`, { token: author, method: 'PUT', body: { active: true } });
assert.ok((await request('/community/feed?mode=saved', { token: author })).items.some(p => p.id === post.id)); checks++;
const voted = await request(`/community/posts/${post.id}/vote`, { token: author, method: 'POST', body: { optionId: post.pollOptions[0].id } });
assert.equal(voted.voteCount, 1); assert.equal(voted.pollOptions[0].voteCount, 1); checks++;
await request(`/community/posts/${post.id}/vote`, { token: author, method: 'POST', body: { optionId: post.pollOptions[1].id }, status: 409 });
assert.equal((await request(`/community/posts/${post.id}`)).voteCount, 0); checks++;
const comment = await request(`/community/posts/${post.id}/comments`, { token: author, method: 'POST', status: 201, body: { body: 'A thoughtful first comment' } });
const reply = await request(`/community/posts/${post.id}/comments`, { token: reader, method: 'POST', status: 201, body: { body: 'Thank you for reading', parentCommentId: comment.id } });
const nested = await request(`/community/posts/${post.id}/comments`, { token: author, method: 'POST', status: 201, body: { body: 'One more detail', parentCommentId: reply.id } });
assert.equal(nested.parentCommentId, comment.id); assert.equal((await request(`/community/posts/${post.id}`)).commentCount, 3); checks++;
const replyNotifications = await request('/notifications?size=100', { token: reader });
assert.ok(replyNotifications.notifications.some(notification => notification.type === 'COMMUNITY_REPLY' && notification.entityId === post.id && notification.actorId === '6a91f6c121f5e13cd8b085c7')); checks++;
await request(`/community/posts/${post.id}`, { token: author, method: 'PATCH', body: { body: 'Not mine' }, status: 403 });
await request(`/community/posts/${post.id}/moderate`, { token: reader, method: 'POST', body: { action: 'PIN' }, status: 403 });
await request(`/community/posts/${post.id}/moderate`, { token: mod, method: 'POST', body: { action: 'LOCK' } });
await request(`/community/posts/${post.id}/comments`, { token: reader, method: 'POST', body: { body: 'Should not post' }, status: 409 });
await request(`/community/posts/${post.id}/moderate`, { token: mod, method: 'POST', body: { action: 'UNLOCK' } });
const report = await request('/reports', { token: author, method: 'POST', body: { targetType: 'COMMUNITY_POST', targetId: post.id, category: 'SPAM', description: 'Synthetic moderation integration check' } });
const queue = await request('/community/moderation/reports', { token: mod });
const queueItem = queue.find(r => r.id === report.id); assert.ok(queueItem); assert.equal('reporterId' in queueItem, false); checks++;
const resolutionResponses = await Promise.all(Array.from({ length: 2 }, () => fetch(`${base}/community/moderation/reports/${report.id}`, {
  method: 'POST', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mod}` },
  body: JSON.stringify({ resolution: 'REMOVE', reason: 'Synthetic concurrent resolution check' })
})));
assert.deepEqual(resolutionResponses.map(response => response.status).sort(), [204, 409]); checks += 3;
await request(`/community/posts/${post.id}`, { status: 404 });
assert.ok(!(await request('/community/feed')).items.some(p => p.id === post.id)); checks++;
const removedForModerator = await request(`/community/posts/${post.id}`, { token: mod });
assert.equal(removedForModerator.status, 'REMOVED'); assert.equal(removedForModerator.body, '<script>plain text only</script>'); checks++;
await request(`/community/posts/${post.id}/moderate`, { token: mod, method: 'POST', body: { action: 'RESTORE' } });
await request(`/community/comments/${reply.id}/moderate`, { token: mod, method: 'POST', body: { action: 'REMOVE', reason: 'Synthetic review visibility check' } });
const removedGuest = (await request(`/community/posts/${post.id}/comments`)).items.find(c => c.id === reply.id);
const removedModerator = (await request(`/community/posts/${post.id}/comments`, { token: mod })).items.find(c => c.id === reply.id);
assert.equal(removedGuest.body, ''); assert.equal(removedModerator.body, 'Thank you for reading'); checks++;
await request(`/community/comments/${reply.id}/moderate`, { token: mod, method: 'POST', body: { action: 'RESTORE', reason: 'Synthetic cleanup' } });
await request(`/community/comments/${comment.id}`, { token: author, method: 'DELETE', status: 204 });
const tombstone = (await request(`/community/posts/${post.id}/comments`)).items.find(c => c.id === comment.id);
assert.equal(tombstone.status, 'DELETED'); assert.equal(tombstone.body, ''); checks++;
const one = await request('/community/feed?limit=1');
assert.ok(one.nextCursor); const two = await request(`/community/feed?limit=1&cursor=${encodeURIComponent(one.nextCursor)}`);
assert.notEqual(one.items[0].id, two.items[0].id); checks++;
await request(`/community/posts/${post.id}`, { token: reader, method: 'DELETE', status: 204 });
await request(`/community/posts/${post.id}`, { status: 404 });
console.log(`Community integration checks passed: ${checks}. Real isolated MongoDB, no mocks.`);
