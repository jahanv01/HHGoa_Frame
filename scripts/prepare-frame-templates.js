const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 1080;
const COLOR_TOLERANCE = 20; // per-channel difference allowed to still count as "same region"
const KEY = [255, 0, 255]; // magenta flatten background, unlikely to appear in these illustrations

async function processFrame(name) {
  const img = await loadImage(`frame-sources/${name}.png`);
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = `rgb(${KEY[0]},${KEY[1]},${KEY[2]})`;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const scale = SIZE / Math.min(img.width, img.height);
  const iw = img.width * scale, ih = img.height * scale;
  ctx.drawImage(img, (SIZE - iw) / 2, (SIZE - ih) / 2, iw, ih);

  const imgData = ctx.getImageData(0, 0, SIZE, SIZE);
  const data = imgData.data;
  const idx = (x, y) => (y * SIZE + x) * 4;

  const startX = Math.floor(SIZE / 2);
  const startY = Math.floor(SIZE / 2);
  const si = idx(startX, startY);
  const seed = [data[si], data[si + 1], data[si + 2]];

  const matches = (x, y) => {
    const i = idx(x, y);
    return (
      Math.abs(data[i] - seed[0]) < COLOR_TOLERANCE &&
      Math.abs(data[i + 1] - seed[1]) < COLOR_TOLERANCE &&
      Math.abs(data[i + 2] - seed[2]) < COLOR_TOLERANCE
    );
  };

  const visited = new Uint8Array(SIZE * SIZE);
  const stack = [[startX, startY]];
  let minX = SIZE, maxX = 0, minY = SIZE, maxY = 0;
  visited[startY * SIZE + startX] = 1;
  let count = 0;

  while (stack.length) {
    const [x, y] = stack.pop();
    const i = idx(x, y);
    data[i + 3] = 0;
    count++;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) continue;
      const vi = ny * SIZE + nx;
      if (visited[vi]) continue;
      visited[vi] = 1;
      if (matches(nx, ny)) stack.push([nx, ny]);
    }
  }

  const leaked = maxX - minX > SIZE * 0.9 || maxY - minY > SIZE * 0.9;
  if (leaked) {
    console.error(`${name}: flood fill leaked out to the image edges (bbox ${maxX - minX}x${maxY - minY}) — the hole isn't fully enclosed, aborting`);
    return null;
  }

  // second pass: restore transparency to the outer die-cut background too —
  // it was flattened to the same key color to work around a getImageData
  // bug, but unlike the hole it should stay transparent, not opaque
  const isKey = (x, y) => {
    const i = idx(x, y);
    return (
      Math.abs(data[i] - KEY[0]) < COLOR_TOLERANCE &&
      Math.abs(data[i + 1] - KEY[1]) < COLOR_TOLERANCE &&
      Math.abs(data[i + 2] - KEY[2]) < COLOR_TOLERANCE &&
      data[i + 3] !== 0
    );
  };
  const edgeSeeds = [];
  for (let x = 0; x < SIZE; x++) {
    edgeSeeds.push([x, 0], [x, SIZE - 1]);
  }
  for (let y = 0; y < SIZE; y++) {
    edgeSeeds.push([0, y], [SIZE - 1, y]);
  }
  const stack2 = [];
  for (const [x, y] of edgeSeeds) {
    const vi = y * SIZE + x;
    if (!visited[vi] && isKey(x, y)) {
      visited[vi] = 1;
      stack2.push([x, y]);
    }
  }
  while (stack2.length) {
    const [x, y] = stack2.pop();
    const i = idx(x, y);
    data[i + 3] = 0;
    const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) continue;
      const vi = ny * SIZE + nx;
      if (visited[vi]) continue;
      visited[vi] = 1;
      if (isKey(nx, ny)) stack2.push([nx, ny]);
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const holeCx = (minX + maxX) / 2;
  const holeCy = (minY + maxY) / 2;
  const holeR = ((maxX - minX) + (maxY - minY)) / 4;

  fs.mkdirSync('public/frames', { recursive: true });
  fs.writeFileSync(`public/frames/${name}.png`, canvas.toBuffer('image/png'));

  console.log(`${name}: hole center (${holeCx.toFixed(0)}, ${holeCy.toFixed(0)}) radius ${holeR.toFixed(0)}, pixels ${count}`);
  return { cx: holeCx, cy: holeCy, r: holeR };
}

async function run() {
  const meta = {};
  for (const name of ['radio', 'postcard', 'map']) {
    meta[name] = await processFrame(name);
  }
  fs.writeFileSync('public/frames/meta.json', JSON.stringify(meta, null, 2));
}

run();
