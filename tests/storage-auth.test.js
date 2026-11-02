import test from 'node:test';
import assert from 'node:assert/strict';
import { storageSignature, verifyStorageRequest } from '../src/storage-auth.js';

test('storage service verifies body, timestamp, signature, and replayed writes', () => {
  process.env.STORAGE_SHARED_SECRET = 'test-only-secret-longer-than-thirty-two-characters';
  const now = Date.now();
  const body = Buffer.from('{"post":"hello"}');
  const path = '/posts';
  const req = { method: 'POST', headers: { 'x-storage-timestamp': String(now), 'x-storage-signature': storageSignature('POST', path, now, body) } };
  assert.equal(verifyStorageRequest(req, path, body, now), true);
  assert.equal(verifyStorageRequest(req, path, body, now), false);
  assert.equal(verifyStorageRequest(req, path, Buffer.from('{}'), now), false);
  assert.equal(verifyStorageRequest(req, path, body, now + 180000), false);
  assert.equal(verifyStorageRequest({ ...req, method: 'DELETE' }, path, body, now), false);
  const putPath = '/posts/00000000-0000-0000-0000-000000000000';
  const put = { method: 'PUT', headers: { 'x-storage-timestamp': String(now), 'x-storage-signature': storageSignature('PUT', putPath, now, body) } };
  assert.equal(verifyStorageRequest(put, putPath, body, now), true);
  assert.equal(verifyStorageRequest(put, putPath, body, now), false);
});
