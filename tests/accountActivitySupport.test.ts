import test from 'node:test';
import assert from 'node:assert/strict';
import { groupNotificationDays, notificationAction } from '../utils/notificationPresentation.ts';
import { supportIncidentReference } from '../utils/supportIncident.ts';

test('notification days group related recent activity with explicit context actions', () => {
 const notices = [{id: '1', createdAt: '2026-10-03T12:00:00Z', type: 'AUTHOR_NEW_CHAPTER'}, {id:'2', createdAt:'2026-10-03T10:00:00Z',type:'COMMENT_REPLY'}, {id:'3', createdAt:'2026-10-02T10:00:00Z',type:'NEW_FOLLOWER'}];
 assert.equal(groupNotificationDays(notices).length, 2);
 assert.equal(groupNotificationDays(notices)[0].items.length, 2);
 assert.equal(notificationAction('AUTHOR_NEW_CHAPTER'), 'Read chapter');
 assert.equal(notificationAction('COMMENT_REPLY'), 'View discussion');
});
test('support incident reference only contains a bounded ID, never copied error payloads', () => {
 assert.equal(supportIncidentReference(JSON.stringify([{incidentId:'WW-abc-12345', message:'password secret', stack:'private manuscript'}])), 'WW-abc-12345');
 assert.equal(supportIncidentReference(JSON.stringify([{incidentId:'secret@example.test'}])), null);
 assert.equal(supportIncidentReference('broken'), null);
});
