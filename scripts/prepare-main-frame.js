const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');

const SIZE = 1080;

async function run() {
  const img = await loadImage('frame-sources/new-frame.webp');

  // tight crop around the ring artwork (measured bbox), with small padding
  const cropX0 = 438, cropY0 = 9, cropSide = 1052;

  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, cropX0, cropY0, cropSide, cropSide, 0, 0, SIZE, SIZE);

  // measure the hole precisely on this final canvas (magenta-flatten trick
  // to work around the getImageData-with-alpha bug documented earlier)
  const measureCanvas = createCanvas(SIZE, SIZE);
  const mctx = measureCanvas.getContext('2d');
  mctx.fillStyle = '#ff00ff';
  mctx.fillRect(0, 0, SIZE, SIZE);
  mctx.drawImage(canvas, 0, 0);
  const flatBuf = measureCanvas.toBuffer('image/png');
  const flatImg = await loadImage(flatBuf);
  const mc2 = createCanvas(SIZE, SIZE);
  const mctx2 = mc2.getContext('2d');
  mctx2.drawImage(flatImg, 0, 0);
  const d = mctx2.getImageData(0, 0, SIZE, SIZE).data;
  const idx = (x, y) => (y * SIZE + x) * 4;
  const isMagenta = (x, y) => {
    const i = idx(x, y);
    return Math.abs(d[i] - 255) < 25 && d[i + 1] < 25 && Math.abs(d[i + 2] - 255) < 25;
  };

  const startX = Math.floor(SIZE / 2), startY = Math.floor(SIZE / 2);
  const visited = new Uint8Array(SIZE * SIZE);
  const stack = [[startX, startY]];
  visited[startY * SIZE + startX] = 1;
  let minX = SIZE, maxX = 0, minY = SIZE, maxY = 0;

  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) continue;
      const vi = ny * SIZE + nx;
      if (visited[vi]) continue;
      visited[vi] = 1;
      if (isMagenta(nx, ny)) stack.push([nx, ny]);
    }
  }

  const leaked = maxX - minX > SIZE * 0.9 || maxY - minY > SIZE * 0.9;
  if (leaked) {
    console.error('Hole flood fill leaked to edges — bad crop or non-enclosed hole');
    return;
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const r = ((maxX - minX) + (maxY - minY)) / 4;

  fs.mkdirSync('public/frames', { recursive: true });
  fs.writeFileSync('public/frames/main.webp', canvas.toBuffer('image/webp'));
  fs.writeFileSync('public/frames/main-meta.json', JSON.stringify({ cx, cy, r }, null, 2));

  console.log(`hole: center (${cx.toFixed(0)}, ${cy.toFixed(0)}) radius ${r.toFixed(0)}`);
}

run();
