import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, getSession, sessionCookie } from '../src/session.js';

test('signed session survives requests, rejects forged and expired tokens', () => {
  process.env.SESSION_SECRET = 'test-only-secret-not-a-production-key-123456789';
  const id = `reader-${'a'.repeat(64)}`;
  const cookie = sessionCookie(createSession({ id, name: 'Reader' }));
  const req = { headers: { cookie } };
  assert.deepEqual(getSession(req)?.user, { id, name: 'Reader' });
  assert.equal(getSession({ headers: { cookie: 'reading_session=forged' } }), null);
  const token = cookie.split(';')[0];
  assert.equal(getSession({ headers: { cookie: token.slice(0, -2) + 'xy' } }), null);
});
