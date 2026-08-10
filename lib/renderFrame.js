const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 1080;
const frameMeta = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'public', 'frames', 'main-meta.json'), 'utf8')
);

let templateCache = null;
async function loadTemplate() {
  if (!templateCache) {
    const buf = fs.readFileSync(path.join(process.cwd(), 'public', 'frames', 'main.webp'));
    templateCache = await loadImage(buf);
  }
  return templateCache;
}

async function renderFrame(photoBuffer) {
  const photo = await loadImage(photoBuffer);
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // photo, cover-fit and clipped to the frame's inner circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(frameMeta.cx, frameMeta.cy, frameMeta.r, 0, Math.PI * 2);
  ctx.clip();
  const scale = Math.max((frameMeta.r * 2) / photo.width, (frameMeta.r * 2) / photo.height);
  const iw = photo.width * scale, ih = photo.height * scale;
  ctx.drawImage(photo, frameMeta.cx - iw / 2, frameMeta.cy - ih / 2, iw, ih);
  ctx.restore();

  // frame artwork on top
  const template = await loadTemplate();
  ctx.drawImage(template, 0, 0, SIZE, SIZE);

  return canvas.toBuffer('image/png');
}

function isLowResolution(width, height, minDiameterPx = 500) {
  return Math.min(width, height) < minDiameterPx;
}

module.exports = { renderFrame, isLowResolution };
