const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');

const W = 1080, H = 1080;
const GREEN = '#0b3d2e';
const CREAM = '#f4ecd8';
const PINK = '#e8477a';
const YELLOW = '#f2c53d';

function makePlaceholderPhoto() {
  const c = createCanvas(900, 1100);
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 1100);
  grad.addColorStop(0, '#7fb8a3');
  grad.addColorStop(1, '#2c5f4d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 900, 1100);
  ctx.fillStyle = '#e0b090';
  ctx.beginPath();
  ctx.ellipse(450, 430, 160, 190, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(280, 620, 340, 480);
  return c;
}

async function render() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2, cy = 540, R = 310;

  // tick ring (radio tuner dial)
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

  // waveform arc across the top (clean sine, no title overlap)
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
    if (deg === -160) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // photo, circular clip
  const photo = await loadImage(makePlaceholderPhoto().toBuffer('image/png'));
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  const scale = Math.max((R * 2) / photo.width, (R * 2) / photo.height);
  const iw = photo.width * scale, ih = photo.height * scale;
  ctx.drawImage(photo, cx - iw / 2, cy - ih / 2 - 20, iw, ih);
  ctx.restore();

  // ring border
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

  // signal dot top
  ctx.fillStyle = YELLOW;
  ctx.beginPath();
  ctx.arc(cx, cy - R - 74, 8, 0, Math.PI * 2);
  ctx.fill();

  // event wordmark
  ctx.fillStyle = CREAM;
  ctx.textAlign = 'center';
  ctx.font = '700 46px sans-serif';
  ctx.fillText('HACKER HOUSE GOA', cx, 90);
  ctx.fillStyle = PINK;
  ctx.font = '700 26px sans-serif';
  ctx.fillText('2026', cx, 128);

  // ticker strip at bottom
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, H - 130, W, 60);
  ctx.fillStyle = GREEN;
  ctx.font = '600 26px sans-serif';
  ctx.fillText('OCT 28–31 · GOA, INDIA · LESS NOISE. MORE SIGNAL.', cx, H - 90);

  ctx.fillStyle = CREAM;
  ctx.font = '500 22px sans-serif';
  ctx.fillText('#FrameInGoa', cx, H - 40);

  fs.writeFileSync('/home/claude/hhgoa-frame/scripts/test-render.png', canvas.toBuffer('image/png'));
  console.log('done');
}

render();
