import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyGoogleToken } from '../src/auth.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = publicKey.export({ format: 'jwk' });
function token(claims, secret = privateKey) {
  const data = [Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test' })).toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url')].join('.');
  return `${data}.${sign('RSA-SHA256', Buffer.from(data), secret).toString('base64url')}`;
}
const claims = { iss: 'https://accounts.google.com', aud: 'client-id', sub: '123456', name: 'Reader', exp: Math.floor(Date.now() / 1000) + 300, iat: Math.floor(Date.now() / 1000) };

test('verifies signature, audience, expiry and Google subject', async t => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ keys: [{ ...jwk, kid: 'test' }] }), headers: new Headers({ 'cache-control': 'max-age=300' }) });
  t.after(() => { globalThis.fetch = oldFetch; });
  assert.deepEqual(await verifyGoogleToken(token(claims), 'client-id'), { id: 'google-123456', name: 'Reader' });
  assert.deepEqual(await verifyGoogleToken(token({ ...claims, sub: 'aBc_123-XyZ' }), 'client-id\n'), { id: 'google-aBc_123-XyZ', name: 'Reader' });
  await assert.rejects(verifyGoogleToken(token({ ...claims, aud: 'other' }), 'client-id'));
  await assert.rejects(verifyGoogleToken(token({ ...claims, exp: 0 }), 'client-id'));
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
  await assert.rejects(verifyGoogleToken(token(claims, other.privateKey), 'client-id'));
});

