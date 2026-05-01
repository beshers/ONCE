const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = path.resolve(__dirname, "..");
const buildDir = path.join(root, "build");
const uiDir = path.join(root, "ui");

fs.mkdirSync(buildDir, { recursive: true });

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const center = (size - 1) / 2;
  const radius = size * 0.42;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const dx = x - center;
      const dy = y - center;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const inside = distance <= radius;
      const ring = Math.abs(distance - radius * 0.68) < size * 0.035;
      const slash = Math.abs((x - y) - size * 0.03) < size * 0.055 && distance < radius * 0.7;

      if (!inside) {
        pixels[index + 3] = 0;
        continue;
      }

      const t = y / Math.max(1, size - 1);
      pixels[index] = Math.round(8 + 12 * t);
      pixels[index + 1] = Math.round(19 + 185 * (1 - t));
      pixels[index + 2] = Math.round(36 + 190 * (1 - t));
      pixels[index + 3] = 255;

      if (ring || slash) {
        pixels[index] = 255;
        pixels[index + 1] = 255;
        pixels[index + 2] = 255;
      }
    }
  }

  return pixels;
}

function png(size) {
  const rgba = drawIcon(size);
  const rows = [];
  for (let y = 0; y < size; y += 1) {
    rows.push(Buffer.from([0]));
    rows.push(rgba.subarray(y * size * 4, (y + 1) * size * 4));
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function ico(sizes) {
  const images = sizes.map((size) => ({ size, data: png(size) }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = header.length + images.length * 16;
  for (const image of images) {
    const entry = Buffer.alloc(16);
    entry[0] = image.size === 256 ? 0 : image.size;
    entry[1] = image.size === 256 ? 0 : image.size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += image.data.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)]);
}

fs.writeFileSync(path.join(buildDir, "icon.png"), png(512));
fs.writeFileSync(path.join(buildDir, "icon.ico"), ico([16, 32, 48, 64, 128, 256]));
fs.writeFileSync(path.join(uiDir, "tray.png"), png(32));
fs.writeFileSync(path.join(uiDir, "tray.ico"), ico([16, 32]));

console.log("Generated OCNE Desktop Agent icons.");
