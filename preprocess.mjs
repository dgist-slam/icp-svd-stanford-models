import fs from 'fs';
import path from 'path';

const DATA_DIR = '../3d_point_cloud_dataset';
const OUT_DIR = './public/models';
const NUM_POINTS = 2000;

const models = [
  { name: 'bunny', file: 'bunny/reconstruction/bun_zipper.ply' },
  { name: 'dragon', file: 'dragon_recon/dragon_vrip.ply' },
  { name: 'happy_buddha', file: 'happy_recon/happy_vrip.ply' },
  { name: 'armadillo', file: 'Armadillo.ply' },
  { name: 'drill', file: 'drill/reconstruction/drill_shaft_vrip.ply' },
];

function parsePlyAscii(content) {
  const lines = content.split('\n');
  let i = 0;
  let vertexCount = 0;
  const properties = [];
  let inVertex = false;

  // Parse header
  while (i < lines.length) {
    const line = lines[i].trim();
    i++;
    if (line === 'end_header') break;
    if (line.startsWith('element vertex')) {
      vertexCount = parseInt(line.split(/\s+/)[2]);
      inVertex = true;
    } else if (line.startsWith('element ')) {
      inVertex = false;
    } else if (inVertex && line.startsWith('property')) {
      const parts = line.split(/\s+/);
      properties.push({ type: parts[1], name: parts[2] });
    }
  }

  const xIdx = properties.findIndex(p => p.name === 'x');
  const yIdx = properties.findIndex(p => p.name === 'y');
  const zIdx = properties.findIndex(p => p.name === 'z');

  const vertices = [];
  for (let v = 0; v < vertexCount && i < lines.length; v++, i++) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts.length < 3) continue;
    vertices.push([
      parseFloat(parts[xIdx]),
      parseFloat(parts[yIdx]),
      parseFloat(parts[zIdx])
    ]);
  }
  return vertices;
}

function parsePlyBinary(buffer) {
  // Find end of header
  let headerEnd = 0;
  const headerStr = buffer.toString('ascii', 0, Math.min(buffer.length, 4096));
  const endIdx = headerStr.indexOf('end_header\n');
  if (endIdx === -1) throw new Error('No end_header found');
  headerEnd = endIdx + 'end_header\n'.length;

  const headerLines = headerStr.substring(0, endIdx).split('\n');
  let vertexCount = 0;
  let format = '';
  const properties = [];
  let inVertex = false;

  for (const line of headerLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('format')) format = trimmed;
    if (trimmed.startsWith('element vertex')) {
      vertexCount = parseInt(trimmed.split(/\s+/)[2]);
      inVertex = true;
    } else if (trimmed.startsWith('element ')) {
      inVertex = false;
    } else if (inVertex && trimmed.startsWith('property')) {
      const parts = trimmed.split(/\s+/);
      properties.push({ type: parts[1], name: parts[2] });
    }
  }

  const isBigEndian = format.includes('big_endian');
  const propSizes = { float: 4, double: 8, int: 4, uint: 4, short: 2, ushort: 2, char: 1, uchar: 1, int32: 4, uint32: 4, int16: 2, uint16: 2, int8: 1, uint8: 1, float32: 4, float64: 8 };
  const vertexSize = properties.reduce((s, p) => s + (propSizes[p.type] || 4), 0);

  const xIdx = properties.findIndex(p => p.name === 'x');
  const yIdx = properties.findIndex(p => p.name === 'y');
  const zIdx = properties.findIndex(p => p.name === 'z');

  function propOffset(idx) {
    let off = 0;
    for (let i = 0; i < idx; i++) off += propSizes[properties[i].type] || 4;
    return off;
  }

  const readFloat = isBigEndian
    ? (buf, off) => buf.readFloatBE(off)
    : (buf, off) => buf.readFloatLE(off);

  const vertices = [];
  let offset = headerEnd;
  for (let v = 0; v < vertexCount; v++) {
    const x = readFloat(buffer, offset + propOffset(xIdx));
    const y = readFloat(buffer, offset + propOffset(yIdx));
    const z = readFloat(buffer, offset + propOffset(zIdx));
    vertices.push([x, y, z]);
    offset += vertexSize;
  }
  return vertices;
}

function subsample(vertices, n) {
  if (vertices.length <= n) return vertices;
  const indices = new Set();
  while (indices.size < n) {
    indices.add(Math.floor(Math.random() * vertices.length));
  }
  return [...indices].sort((a, b) => a - b).map(i => vertices[i]);
}

function normalize(vertices) {
  // Center and scale to [-1, 1]
  let minX = Inf, minY = Inf, minZ = Inf;
  let maxX = -Inf, maxY = -Inf, maxZ = -Inf;
  for (const [x, y, z] of vertices) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
  const scale = Math.max(maxX - minX, maxY - minY, maxZ - minZ) / 2;

  return vertices.map(([x, y, z]) => [
    +((x - cx) / scale).toFixed(6),
    +((y - cy) / scale).toFixed(6),
    +((z - cz) / scale).toFixed(6)
  ]);
}

const Inf = Infinity;

for (const model of models) {
  const filePath = path.resolve(DATA_DIR, model.file);
  console.log(`Processing ${model.name} from ${filePath}...`);

  let vertices;
  const buffer = fs.readFileSync(filePath);
  const headerPeek = buffer.toString('ascii', 0, 200);

  if (headerPeek.includes('format ascii')) {
    const content = buffer.toString('utf-8');
    vertices = parsePlyAscii(content);
  } else {
    vertices = parsePlyBinary(buffer);
  }

  console.log(`  Raw vertices: ${vertices.length}`);
  vertices = subsample(vertices, NUM_POINTS);
  console.log(`  Subsampled to: ${vertices.length}`);
  vertices = normalize(vertices);

  const outPath = path.join(OUT_DIR, `${model.name}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ name: model.name, points: vertices }));
  console.log(`  Saved to ${outPath}`);
}

console.log('Done!');
