import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExport } from '../src/export.js';

async function unzip(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const entries = new Map();
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true);
    const nameSize = view.getUint16(offset + 26, true);
    const extraSize = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 30, offset + 30 + nameSize));
    const start = offset + 30 + nameSize + extraSize;
    entries.set(name, bytes.slice(start, start + size));
    offset = start + size;
  }
  assert.equal(view.getUint32(offset, true), 0x02014b50);
  return entries;
}

test('exports each reading and its image with a relative Markdown preview link', async () => {
  const post = {
    id: 'reading-1', authorId: 'me', text: 'First line\n\nSecond line', cityId: 'paris',
    createdAt: '2026-10-31T09:25:53.332Z', image: '/api/images/reading-1',
  };
  const image = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const archive = await buildExport([post], async url => {
    assert.equal(url, post.image);
    return new Response(image, { headers: { 'Content-Type': 'image/jpeg' } });
  });
  const entries = await unzip(archive);
  assert.deepEqual([...entries.keys()], ['2026-10-31-reading-1.md', 'images/reading-1.jpg']);
  assert.match(new TextDecoder().decode(entries.get('2026-10-31-reading-1.md')), /!\[Reading image\]\(images\/reading-1\.jpg\)\n\nFirst line\n\nSecond line/);
  assert.deepEqual(entries.get('images/reading-1.jpg'), image);
});

test('empty profiles export a readable archive and failed images stop the download', async () => {
  const empty = await unzip(await buildExport([]));
  assert.match(new TextDecoder().decode(empty.get('README.md')), /No readings yet/);
  await assert.rejects(buildExport([{
    id: 'reading-1', createdAt: '2026-10-31T09:25:53.332Z', image: '/api/images/reading-1', text: 'test', cityId: null,
  }], async () => new Response(null, { status: 404 })), /Could not download the image/);
});
