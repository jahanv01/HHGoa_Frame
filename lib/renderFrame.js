const { createCanvas, loadImage } = require('@napi-rs/canvas');

const W = 1080;
const H = 1080;
const GREEN = '#0b3d2e';
const CREAM = '#f4ecd8';
const PINK = '#e8477a';
const YELLOW = '#f2c53d';

async function renderFrame(photoBuffer) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const cy = 540;
  const R = 310;

  ctx.strokeStyle = CREAM;
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const long = i % 6 === 0;
    const r1 = R + 14;
    const r2 = long ? R + 34 : R + 24;
    ctx.lineWidth = long ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }

  ctx.strokeStyle = PINK;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const wfR = R + 60;
  for (let deg = -160; deg <= -20; deg += 2) {
    const a = (deg * Math.PI) / 180;
    const spike = Math.sin(deg * 0.55) * 14;
    const r = wfR + spike;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (deg === -160) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const photo = await loadImage(photoBuffer);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  // cover-fit: fill the circle regardless of the photo's own aspect ratio/orientation
  const scale = Math.max((R * 2) / photo.width, (R * 2) / photo.height);
  const iw = photo.width * scale;
  const ih = photo.height * scale;
  ctx.drawImage(photo, cx - iw / 2, cy - ih / 2, iw, ih);
  ctx.restore();

  ctx.strokeStyle = CREAM;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = PINK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, R + 6, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = YELLOW;
  ctx.beginPath();
  ctx.arc(cx, cy - R - 74, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = CREAM;
  ctx.textAlign = 'center';
  ctx.font = '700 46px sans-serif';
  ctx.fillText('HACKER HOUSE GOA', cx, 90);
  ctx.fillStyle = PINK;
  ctx.font = '700 26px sans-serif';
  ctx.fillText('2026', cx, 128);

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, H - 130, W, 60);
  ctx.fillStyle = GREEN;
  ctx.font = '600 26px sans-serif';
  ctx.fillText('OCT 28–31 · GOA, INDIA · LESS NOISE. MORE SIGNAL.', cx, H - 90);

  ctx.fillStyle = CREAM;
  ctx.font = '500 22px sans-serif';
  ctx.fillText('#FrameInGoa', cx, H - 40);

  return canvas.toBuffer('image/png');
}

module.exports = { renderFrame };
