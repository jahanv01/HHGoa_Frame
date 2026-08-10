const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 1080;

let templateCache = null;
async function loadTemplate() {
  if (!templateCache) {
    const buf = fs.readFileSync(path.join(process.cwd(), 'public', 'frames', 'main.webp'));
    templateCache = await loadImage(buf);
  }
  return templateCache;
}

// The frame's "hole" is NOT a clean circle — the watermark text near the
// bottom sits close enough to the ring that the transparent gaps between
// its letters connect straight through to the true opening, giving it a
// jagged, text-shaped fringe. Any single circle (cx/cy/r) — hand-measured,
// checked into main-meta.json, or recomputed live — is an approximation of
// a shape that isn't circular, and will always leave a gap somewhere along
// that boundary in some direction. That gap is the actual bug: the photo
// clipped to an approximated circle doesn't fully cover the true irregular
// opening, so raw canvas shows through in the mismatch.
//
// Fix: don't approximate the hole as a circle at all. Derive a pixel-exact
// mask straight from main.webp's own alpha channel and use it to clip the
// photo via 'destination-in' compositing, so the photo can only ever show
// exactly where the real hole is.
//
// Important: the mask must be built from the FLOOD-FILL-CONNECTED hole
// only (starting from the frame's center), not a blanket inversion of the
// whole alpha channel — main.webp is also transparent in the corners
// *outside* the entire frame disc, and a naive full inversion would treat
// that as "hole" too, letting the photo bleed into the four corners around
// the frame. Flood fill keeps the mask scoped to the one connected region
// that's actually the viewing window.
let holeMaskCache = null;
async function getHoleMask() {
  if (holeMaskCache) return holeMaskCache;
  const template = await loadTemplate();
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(template, 0, 0, SIZE, SIZE);
  const d = ctx.getImageData(0, 0, SIZE, SIZE).data;
  const alphaAt = (x, y) => d[(y * SIZE + x) * 4 + 3];

  const startX = Math.floor(SIZE / 2), startY = Math.floor(SIZE / 2);
  const visited = new Uint8Array(SIZE * SIZE);
  const stack = [[startX, startY]];
  visited[startY * SIZE + startX] = 1;

  while (stack.length) {
    const [x, y] = stack.pop();
    const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) continue;
      const vi = ny * SIZE + nx;
      if (visited[vi]) continue;
      visited[vi] = 1;
      if (alphaAt(nx, ny) < 10) stack.push([nx, ny]);
    }
  }

  const maskCanvas = createCanvas(SIZE, SIZE);
  const maskImgData = maskCanvas.getContext('2d').createImageData(SIZE, SIZE);
  for (let i = 0; i < visited.length; i++) {
    if (visited[i]) {
      maskImgData.data[i * 4] = 255;
      maskImgData.data[i * 4 + 1] = 255;
      maskImgData.data[i * 4 + 2] = 255;
      maskImgData.data[i * 4 + 3] = 255;
    }
  }
  maskCanvas.getContext('2d').putImageData(maskImgData, 0, 0);
  holeMaskCache = await loadImage(maskCanvas.toBuffer('image/png'));
  return holeMaskCache;
}

// Rough sizing reference only — used to decide how big to scale the photo
// and how much slack there is for repositioning, NOT for clipping. Uses the
// larger of width/height reach so the cover-fit always overscans the true
// hole in every direction; the exact containment is guaranteed separately
// by the pixel mask above, so overscanning here just means extra photo
// gets hidden behind the ring — never a gap.
let sizingMetaCache = null;
async function getSizingMeta() {
  if (sizingMetaCache) return sizingMetaCache;
  const mask = await getHoleMask();
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(mask, 0, 0, SIZE, SIZE);
  const d = ctx.getImageData(0, 0, SIZE, SIZE).data;
  let minX = SIZE, maxX = 0, minY = SIZE, maxY = 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (d[(y * SIZE + x) * 4 + 3] > 200) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const r = Math.max((maxX - minX) / 2, (maxY - minY) / 2); // larger reach, deliberately generous
  sizingMetaCache = { cx, cy, r };
  return sizingMetaCache;
}

// Default vertical bias: most portrait photos have the face in the upper
// half, but a pure center-crop treats the image geometric center as the
// subject — which cuts foreheads/chins on tall photos. Shifting the drawn
// image down (revealing more of its top) fixes this for the common case
// without needing the user to manually adjust anything.
const DEFAULT_Y_BIAS = 0.35;

async function renderFrame(photoBuffer, offsetX = 0, offsetY = DEFAULT_Y_BIAS) {
  const [photo, sizing, holeMask, template] = await Promise.all([
    loadImage(photoBuffer),
    getSizingMeta(),
    getHoleMask(),
    loadTemplate(),
  ]);

  const clampedX = Math.max(-1, Math.min(1, offsetX));
  const clampedY = Math.max(-1, Math.min(1, offsetY));

  const scale = Math.max((sizing.r * 2) / photo.width, (sizing.r * 2) / photo.height);
  const iw = photo.width * scale, ih = photo.height * scale;
  const maxOffsetX = Math.max(0, (iw - sizing.r * 2) / 2);
  const maxOffsetY = Math.max(0, (ih - sizing.r * 2) / 2);
  const drawX = sizing.cx - iw / 2 + clampedX * maxOffsetX;
  const drawY = sizing.cy - ih / 2 + clampedY * maxOffsetY;

  // draw the photo on its own layer, then mask it to the exact hole shape
  const photoLayer = createCanvas(SIZE, SIZE);
  const plCtx = photoLayer.getContext('2d');
  plCtx.imageSmoothingEnabled = true;
  plCtx.imageSmoothingQuality = 'high';
  plCtx.drawImage(photo, drawX, drawY, iw, ih);
  plCtx.globalCompositeOperation = 'destination-in';
  plCtx.drawImage(holeMask, 0, 0, SIZE, SIZE);

  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(photoLayer, 0, 0);
  ctx.drawImage(template, 0, 0, SIZE, SIZE);

  return canvas.toBuffer('image/png');
}

function isLowResolution(width, height, minDiameterPx = 500) {
  return Math.min(width, height) < minDiameterPx;
}

module.exports = { renderFrame, isLowResolution };