const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const filename = require('node:path').join(__dirname, 'community.ts');
const moduleObject = { exports: {} };
if (fs.existsSync(filename)) {
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('exports', 'require', 'module', source)(moduleObject.exports, require, moduleObject);
}
const helpers = moduleObject.exports;
const base = { circleId: 'circle', type: 'UPDATE', body: ' A story worth discussing ' };
test('post validation accepts plain updates and trims body', () => {
  assert.equal(typeof helpers.validatePost, 'function');
  assert.deepEqual(helpers.validatePost(base), {});
  assert.equal(helpers.postPayload(base).body, 'A story worth discussing');
});
test('post validation enforces body/title limits and required circle', () => {
  assert.equal(typeof helpers.validatePost, 'function');
  assert.ok(helpers.validatePost({ ...base, body: '  ' }).body);
  assert.ok(helpers.validatePost({ ...base, body: 'a'.repeat(5001) }).body);
  assert.ok(helpers.validatePost({ ...base, circleId: '' }).circleId);
  assert.ok(helpers.validatePost({ ...base, type: 'WORKSHOP', title: '' }).title);
  assert.ok(helpers.validatePost({ ...base, title: 'a'.repeat(141) }).title);
});
test('poll options require two to six distinct case-insensitive trimmed values', () => {
  assert.equal(typeof helpers.validatePost, 'function');
  const poll = { ...base, type: 'POLL', title: 'Which ending?', pollOptions: ['Yes', 'No'] };
  assert.deepEqual(helpers.validatePost(poll), {});
  for (const pollOptions of [['Yes'], ['Yes', ' yes '], ['', 'No'], Array(7).fill('x'), ['a'.repeat(101), 'No']]) {
    assert.ok(helpers.validatePost({ ...poll, pollOptions }).pollOptions);
  }
});
test('release and recommendation enforce attachment ownership', () => {
  assert.equal(typeof helpers.validatePost, 'function');
  assert.ok(helpers.validatePost({ ...base, type: 'RELEASE', title: 'New chapter' }).attachment);
  assert.ok(helpers.validatePost({ ...base, type: 'RELEASE', title: 'New chapter', attachment: { bookId: 'b', owned: false } }).attachment);
  assert.ok(helpers.validatePost({ ...base, type: 'RECOMMENDATION', attachment: { bookId: 'b', owned: true } }).attachment);
  assert.deepEqual(helpers.validatePost({ ...base, type: 'RECOMMENDATION', attachment: { bookId: 'b', owned: false } }), {});
});
test('comment validation rejects whitespace and overlong content', () => {
  assert.equal(typeof helpers.validateComment, 'function');
  assert.ok(helpers.validateComment('  '));
  assert.ok(helpers.validateComment('x'.repeat(2001)));
  assert.equal(helpers.validateComment(' thoughtful reply '), '');
});
test('cursor merging replaces duplicates and groups orphan replies across pages', () => {
  assert.equal(typeof helpers.mergeById, 'function');
  const first = [{ id: 'reply', parentCommentId: 'root', body: 'Reply' }];
  assert.equal(helpers.groupComments(first)[0].orphan, true);
  const merged = helpers.mergeById(first, [{ id: 'root', parentCommentId: null, body: 'Root' }, { id: 'reply', parentCommentId: 'root', body: 'Updated' }]);
  assert.equal(merged.length, 2);
  const groups = helpers.groupComments(merged);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].root.id, 'root');
  assert.equal(groups[0].replies[0].body, 'Updated');
  assert.equal(groups[0].orphan, false);
  assert.deepEqual(helpers.mergeById([], [{ id: 'post' }, { id: 'post' }]), [{ id: 'post' }]);
});
test('desired-state reactions are idempotent and never create negative counts', () => {
  assert.equal(typeof helpers.optimisticReaction, 'function');
  const post = { liked: false, saved: false, likeCount: 0 };
  const liked = helpers.optimisticReaction(post, 'like', true);
  assert.deepEqual(liked, { liked: true, saved: false, likeCount: 1 });
  assert.deepEqual(helpers.optimisticReaction(liked, 'like', true), liked);
  assert.equal(helpers.optimisticReaction(post, 'like', false).likeCount, 0);
  assert.equal(helpers.optimisticReaction(post, 'save', true).likeCount, 0);
});
test('discuss links use UPDATE for nonowners, encode IDs and preserve chapter', () => {
  assert.equal(typeof helpers.discussLink, 'function');
  const params = new URLSearchParams(helpers.discussLink('book &', 'chapter?', false).split('?')[1]);
  assert.equal(params.get('type'), 'UPDATE');
  assert.equal(params.get('bookId'), 'book &');
  assert.equal(params.get('chapterId'), 'chapter?');
  assert.equal(new URLSearchParams(helpers.discussLink('book', null, true).split('?')[1]).get('type'), 'RELEASE');
});
test('community notification route prefers metadata post ID and handles comment reports', () => {
  assert.equal(typeof helpers.communityNotificationPostId, 'function');
  assert.equal(helpers.communityNotificationPostId({ type: 'COMMUNITY_REPLY', entityType: 'COMMUNITY_POST', entityId: 'post' }), 'post');
  assert.equal(helpers.communityNotificationPostId({ type: 'CONTENT_REPORT_NOTICE', entityId: 'comment', metadata: { postId: 'post' } }), 'post');
  assert.equal(helpers.communityNotificationPostId({ type: 'NEW_COMMENT', entityId: 'comment' }), null);
});
test('feed modes persist when navigating from a circle and reject unknown modes', () => {
  assert.equal(typeof helpers.communityFeedMode, 'function');
  assert.equal(helpers.communityFeedMode('mode=following'), 'following');
  assert.equal(helpers.communityFeedMode('mode=saved&compose=1'), 'saved');
  assert.equal(helpers.communityFeedMode('mode=admin'), 'discover');
});
test('composer defaults choose a supported circle and format as circles arrive', () => {
  assert.equal(typeof helpers.composerDefaults, 'function');
  const circles = [{ id: 'updates', allowedPostTypes: ['UPDATE'] }, { id: 'releases', allowedPostTypes: ['RELEASE'] }];
  assert.deepEqual(helpers.composerDefaults(circles, undefined, 'RELEASE'), { circleId: 'releases', type: 'RELEASE' });
  assert.deepEqual(helpers.composerDefaults(circles, 'releases', 'UPDATE'), { circleId: 'releases', type: 'RELEASE' });
});
test('loading an older comment page after posting keeps roots and replies chronological', () => {
  const comment = (id, minute, parentCommentId = null) => ({ id, parentCommentId, createdAt: `2026-08-29T00:${minute}:00Z` });
  let comments = helpers.mergeById([], [comment('root-a', '01'), comment('reply-a', '02', 'root-a')]);
  comments = helpers.mergeById(comments, [comment('root-new', '09'), comment('reply-new', '10', 'root-a')]);
  comments = helpers.mergeById(comments, [comment('root-b', '03'), comment('reply-b', '04', 'root-a'), comment('root-d', '05'), comment('root-c', '05')]);
  const groups = helpers.groupComments(comments);
  assert.deepEqual(groups.map(group => group.root.id), ['root-a', 'root-b', 'root-c', 'root-d', 'root-new']);
  assert.deepEqual(groups[0].replies.map(reply => reply.id), ['reply-a', 'reply-b', 'reply-new']);
  assert.deepEqual(helpers.mergeById([{ id: 'ranked-first', createdAt: '2026-08-29' }], [{ id: 'ranked-second', createdAt: '2020-01-01' }]).map(item => item.id), ['ranked-first', 'ranked-second']);
});
test('circle to Saved navigation always produces an unfiltered global feed URL', () => {
  assert.equal(typeof helpers.communityFeedLink, 'function');
  const previous = '#/community/circle/general';
  const target = helpers.communityFeedLink('saved');
  assert.notEqual(target, previous);
  assert.equal(target, '#/community?mode=saved');
  assert.equal(target.includes('/circle/'), false);
  assert.equal(helpers.communityFeedMode(target.split('?')[1]), 'saved');
});
test('comment count deltas cover creation, delete, moderation removal and restoration exactly once', () => {
  assert.equal(typeof helpers.commentVisibilityDelta, 'function');
  assert.equal(typeof helpers.withCommentCountDelta, 'function');
  const active = { status: 'ACTIVE' };
  const removed = { status: 'REMOVED' };
  const deleted = { status: 'DELETED' };
  let post = { id: 'post', commentCount: 3, saved: true };
  post = helpers.withCommentCountDelta(post, helpers.commentVisibilityDelta(undefined, active));
  assert.equal(post.commentCount, 4);
  post = helpers.withCommentCountDelta(post, helpers.commentVisibilityDelta(active, deleted));
  assert.equal(post.commentCount, 3);
  post = helpers.withCommentCountDelta(post, helpers.commentVisibilityDelta(active, removed));
  assert.equal(post.commentCount, 2);
  post = helpers.withCommentCountDelta(post, helpers.commentVisibilityDelta(removed, active));
  assert.equal(post.commentCount, 3);
  assert.equal(helpers.commentVisibilityDelta(active, active), 0);
  assert.equal(helpers.commentVisibilityDelta(deleted, deleted), 0);
  assert.equal(helpers.commentVisibilityDelta(removed, deleted), 0);
  assert.equal(helpers.withCommentCountDelta({ commentCount: 0 }, -1).commentCount, 0);
  assert.equal(post.saved, true);
});
test('first-login onboarding retains community, compose and post destinations', () => {
  assert.equal(typeof helpers.communityReturnLink, 'function');
  assert.equal(typeof helpers.communityComposeLink, 'function');
  assert.equal(helpers.communityReturnLink({ name: 'community' }), '#/community');
  const compose = helpers.communityComposeLink('general', 'bookId=book&chapterId=chapter&type=UPDATE');
  assert.equal(compose, '#/community/circle/general?bookId=book&chapterId=chapter&type=UPDATE&compose=1');
  const intended = { name: 'community', circleSlug: 'general', query: compose.split('?')[1] };
  assert.equal(helpers.communityReturnLink(intended), compose);
  assert.equal(helpers.communityReturnLink({ name: 'community-post', postId: 'post' }), '#/community/post/post');
  assert.equal(helpers.communityReturnLink({ name: 'home' }), null);
  assert.equal(helpers.communityReturnLink(null), null);
});
test('Whats New dismiss control renders above its overlapping content layer', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '../components/WhatsNewPopup.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const componentModule = { exports: {} };
  new Function('exports', 'require', 'module', compiled)(componentModule.exports, require, componentModule);
  const markup = require('react-dom/server').renderToStaticMarkup(require('react').createElement(componentModule.exports.WhatsNewPopup));
  const close = markup.match(/<button[^>]*aria-label="Dismiss whats new popup"[^>]*>/)?.[0];
  assert.ok(close, 'Dismiss control is present');
  const closeClass = close.match(/class="([^"]*)"/)[1];
  const contentClass = markup.match(/class="([^"]*flex items-start[^\"]*relative[^\"]*)"/)[1];
  const layer = classes => Number(classes.match(/\bz-(\d+)\b/)?.[1] || 0);
  assert.ok(layer(closeClass) > layer(contentClass), 'Dismiss control must stack above the content wrapper');
});
test('replying to a reply targets the visible reply while storage can still flatten it', () => {
  assert.equal(typeof helpers.communityReplyTargetId, 'function');
  assert.equal(helpers.communityReplyTargetId({ id: 'reply-2', parentCommentId: 'root-1' }), 'reply-2');
  assert.equal(helpers.communityReplyTargetId({ id: 'root-1', parentCommentId: null }), 'root-1');
});
test('moderators can inspect removed content but author-deleted content stays concealed', () => {
  assert.equal(typeof helpers.canShowCommunityContent, 'function');
  assert.equal(helpers.canShowCommunityContent('ACTIVE', false), true);
  assert.equal(helpers.canShowCommunityContent('REMOVED', true), true);
  assert.equal(helpers.canShowCommunityContent('REMOVED', false), false);
  assert.equal(helpers.canShowCommunityContent('DELETED', true), false);
});
test('warning-gated discussions stay concealed until the post is revealed', () => {
  assert.equal(typeof helpers.canShowCommunityDiscussion, 'function');
  assert.equal(helpers.canShowCommunityDiscussion([], false), true);
  assert.equal(helpers.canShowCommunityDiscussion(['SPOILERS'], false), false);
  assert.equal(helpers.canShowCommunityDiscussion(['SPOILERS'], true), true);
});
