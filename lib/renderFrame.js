const { createCanvas, loadImage } = require('@napi-rs/canvas');

const W = 1080;
const H = 1080;
const GREEN = '#0b3d2e';
const CREAM = '#f4ecd8';
const PINK = '#e8477a';
const YELLOW = '#f2c53d';
const BLUE = '#2f5f8a';
const RED = '#c23b3b';

function drawPhoto(ctx, photo, cx, cy, R) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  // cover-fit: always fills the circle regardless of the source's own
  // aspect ratio or orientation, never stretches to a wrong ratio
  const scale = Math.max((R * 2) / photo.width, (R * 2) / photo.height);
  const iw = photo.width * scale;
  const ih = photo.height * scale;
  ctx.drawImage(photo, cx - iw / 2, cy - ih / 2, iw, ih);
  ctx.restore();
}

function renderSignal(ctx, photo) {
  const cx = W / 2, cy = 540, R = 310;

  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = CREAM;
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const long = i % 6 === 0;
    const r1 = R + 14, r2 = long ? R + 34 : R + 24;
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
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (deg === -160) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  drawPhoto(ctx, photo, cx, cy, R);

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
}

function renderPostmark(ctx, photo) {
  const cx = W / 2, cy = 540, R = 300;

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);

  // airmail stripes top and bottom
  const stripeH = 26;
  let stripeIndex = 0;
  for (const y of [0, H - stripeH]) {
    stripeIndex = 0;
    for (let x = -40; x < W + 40; x += 60) {
      ctx.fillStyle = stripeIndex % 2 === 0 ? RED : BLUE;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, 30, stripeH);
      ctx.clip();
      ctx.fillRect(x - 10, y, 50, stripeH);
      ctx.restore();
      stripeIndex++;
    }
  }

  // perforated stamp-edge ring (dashed circle)
  ctx.strokeStyle = GREEN;
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, R + 26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  drawPhoto(ctx, photo, cx, cy, R);

  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // postmark stamp, bottom-right, overlapping the photo edge
  const px = cx + R * 0.62, py = cy + R * 0.62, pr = 90;
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = RED;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px, py, pr - 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = RED;
  ctx.textAlign = 'center';
  ctx.font = '700 16px sans-serif';
  ctx.fillText('GOA', px, py - 6);
  ctx.fillText('INDIA', px, py + 12);
  ctx.font = '600 12px sans-serif';
  ctx.fillText('OCT 2026', px, py + 30);

  ctx.fillStyle = GREEN;
  ctx.textAlign = 'center';
  ctx.font = '700 44px serif';
  ctx.fillText('HACKER HOUSE GOA', cx, 150);
  ctx.fillStyle = RED;
  ctx.font = '700 24px serif';
  ctx.fillText('2026 · GOA, INDIA', cx, 186);

  ctx.fillStyle = GREEN;
  ctx.font = '500 20px sans-serif';
  ctx.fillText('#FrameInGoa · OCT 28–31', cx, H - 44);
}

function renderBoarding(ctx, photo) {
  const cx = W / 2, cy = 500, R = 300;

  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, W, H);

  drawPhoto(ctx, photo, cx, cy, R);

  ctx.strokeStyle = CREAM;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // ticket zigzag edge, top
  ctx.fillStyle = YELLOW;
  ctx.beginPath();
  const zigY = cy - R - 40;
  ctx.moveTo(cx - 200, zigY + 20);
  for (let x = -200; x <= 200; x += 20) {
    ctx.lineTo(cx + x, zigY + (Math.floor((x + 200) / 20) % 2 === 0 ? 0 : 20));
  }
  ctx.lineTo(cx + 200, zigY + 40);
  ctx.lineTo(cx - 200, zigY + 40);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = GREEN;
  ctx.textAlign = 'center';
  ctx.font = '700 20px monospace';
  ctx.fillText('BOARDING PASS', cx, zigY + 27);

  ctx.fillStyle = CREAM;
  ctx.font = '700 42px sans-serif';
  ctx.fillText('HACKER HOUSE GOA', cx, 110);
  ctx.fillStyle = PINK;
  ctx.font = '700 24px sans-serif';
  ctx.fillText('DEST: GOA, INDIA · 2026', cx, 144);

  // ribbon banner across the bottom
  ctx.fillStyle = PINK;
  ctx.fillRect(0, H - 150, W, 70);
  ctx.fillStyle = CREAM;
  ctx.font = '700 26px monospace';
  ctx.fillText('GATE: BUILD · OCT 28–31', cx, H - 105);
  ctx.font = '500 20px sans-serif';
  ctx.fillText('#FrameInGoa', cx, H - 40);
}

const THEMES = {
  signal: renderSignal,
  postmark: renderPostmark,
  boarding: renderBoarding,
};

async function renderFrame(photoBuffer, theme = 'signal') {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const photo = await loadImage(photoBuffer);
  const renderer = THEMES[theme] || THEMES.signal;
  renderer(ctx, photo);

  return canvas.toBuffer('image/png');
}

function isLowResolution(width, height, minDiameterPx = 500) {
  return Math.min(width, height) < minDiameterPx;
}

module.exports = { renderFrame, isLowResolution };
