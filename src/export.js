import { getCity, cityLabel } from './cities.js';

const encoder = new TextEncoder();
const validId = /^[a-zA-Z0-9-]{1,80}$/;
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  return crc >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(entries) {
  const parts = [];
  const directory = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const filename = encoder.encode(name);
    const bytes = typeof content === 'string' ? encoder.encode(content) : content;
    const crc = crc32(bytes);
    const local = new Uint8Array(30 + filename.length);
    const header = new DataView(local.buffer);
    header.setUint32(0, 0x04034b50, true);
    header.setUint16(4, 20, true);
    header.setUint16(6, 0x0800, true); // UTF-8 filenames.
    header.setUint32(14, crc, true);
    header.setUint32(18, bytes.length, true);
    header.setUint32(22, bytes.length, true);
    header.setUint16(26, filename.length, true);
    local.set(filename, 30);
    parts.push(local, bytes);

    const record = new Uint8Array(46 + filename.length);
    const central = new DataView(record.buffer);
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, bytes.length, true);
    central.setUint32(24, bytes.length, true);
    central.setUint16(28, filename.length, true);
    central.setUint32(42, offset, true);
    record.set(filename, 46);
    directory.push(record);
    offset += local.length + bytes.length;
  }
  const directorySize = directory.reduce((size, record) => size + record.length, 0);
  const end = new Uint8Array(22);
  const footer = new DataView(end.buffer);
  footer.setUint32(0, 0x06054b50, true);
  footer.setUint16(8, entries.length, true);
  footer.setUint16(10, entries.length, true);
  footer.setUint32(12, directorySize, true);
  footer.setUint32(16, offset, true);
  return new Blob([...parts, ...directory, end], { type: 'application/zip' });
}

function markdown(post, imageName) {
  const city = post.cityId && getCity(post.cityId);
  const lines = [`# Reading - ${post.createdAt.slice(0, 10)}`, '', `Published: ${post.createdAt}`];
  if (city) lines.push(`City: ${cityLabel(city)}`);
  lines.push('', '![Reading image](images/' + imageName + ')', '', post.text, '');
  return lines.join('\n');
}

export async function buildExport(posts, fetchImage = fetch) {
  if (posts.length > 65535) throw new Error('Too many readings to export at once.');
  const entries = [];
  for (const post of posts) {
    if (!validId.test(post.id) || !/^\d{4}-\d{2}-\d{2}T/.test(post.createdAt) || !/^\/api\/images\/[a-zA-Z0-9-]{1,80}$/.test(post.image)) throw new Error('Could not export an invalid reading.');
    const response = await fetchImage(post.image, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`Could not download the image for reading ${post.id}.`);
    if (!response.headers.get('content-type')?.toLowerCase().startsWith('image/jpeg')) throw new Error(`Invalid image for reading ${post.id}.`);
    const imageName = `${post.id}.jpg`;
    const filename = `${post.createdAt.slice(0, 10)}-${post.id}.md`;
    entries.push([filename, markdown(post, imageName)]);
    entries.push([`images/${imageName}`, new Uint8Array(await response.arrayBuffer())]);
  }
  if (!posts.length) entries.push(['README.md', '# My readings\n\nNo readings yet.\n']);
  return zip(entries);
}
