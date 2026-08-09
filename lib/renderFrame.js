const { createCanvas, loadImage } = require('@napi-rs/canvas');

const W = 1080;
const H = 1080;
const GREEN = '#0b3d2e';
const GREEN_LIGHT = '#3f7a5f';
const CREAM = '#f4ecd8';
const PINK = '#e8477a';
const YELLOW = '#f2c53d';
const NAVY = '#08251c';

const DATE_LINE = 'OCT 28–31 · GOA, INDIA';
const HASHTAG = '#FrameInGoa';
const TAGLINE = 'LESS NOISE. MORE SIGNAL. · 2:47 PM STUDIO';

function drawArcText(ctx, text, cx, cy, radius, centerAngle, font, color, letterSpacing = 0) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = text.split('');
  const widths = chars.map((c) => ctx.measureText(c).width + letterSpacing);
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  const totalAngle = totalWidth / radius;
  let angle = centerAngle - totalAngle / 2;
  chars.forEach((ch, i) => {
    const w = widths[i];
    const da = w / radius;
    angle += da / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    angle += da / 2;
  });
  ctx.restore();
}

function drawPhoto(ctx, photo, cx, cy, R, tint) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  const scale = Math.max((R * 2) / photo.width, (R * 2) / photo.height);
  const iw = photo.width * scale;
  const ih = photo.height * scale;
  ctx.drawImage(photo, cx - iw / 2, cy - ih / 2, iw, ih);
  if (tint) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = tint.alpha;
    ctx.fillStyle = tint.color;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

function drawPalm(ctx, x, y, scale, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-16, -55, 6, -100);
  ctx.stroke();
  const fronds = [
    [-70, -110, -20, -95],
    [70, -110, 30, -95],
    [-55, -140, 0, -108],
    [55, -140, 12, -108],
    [-20, -150, 8, -112],
    [20, -152, 8, -112],
  ];
  ctx.lineWidth = 12;
  for (const [fx, fy, mx, my] of fronds) {
    ctx.beginPath();
    ctx.moveTo(6, -100);
    ctx.quadraticCurveTo(mx, my, fx, fy);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBoat(ctx, x, y, scale, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-30, 0);
  ctx.lineTo(30, 0);
  ctx.lineTo(20, 14);
  ctx.lineTo(-20, 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -30);
  ctx.lineTo(16, -8);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawWaves(ctx, y, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  for (let row = 0; row < 3; row++) {
    ctx.beginPath();
    const yy = y + row * 16;
    for (let x = -20; x <= W + 20; x += 40) {
      ctx.arc(x, yy, 20, Math.PI, 0, false);
    }
    ctx.stroke();
  }
}

function renderSignal(ctx, photo) {
  const cx = W / 2, cy = 540, R = 300;

  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, W, H);

  // Goa horizon: sea waves + palms + a boat, sitting behind the tuner ring
  drawWaves(ctx, H - 190, GREEN_LIGHT);
  drawPalm(ctx, 110, H - 180, 1.0, GREEN_LIGHT);
  drawPalm(ctx, W - 120, H - 195, 0.85, GREEN_LIGHT);
  drawBoat(ctx, W / 2 + 260, H - 250, 1.2, GREEN_LIGHT);

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

  drawPhoto(ctx, photo, cx, cy, R, { color: GREEN, alpha: 0.16 });

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

  // title follows the outer rim, above the waveform, like a dial readout
  drawArcText(ctx, 'HACKER HOUSE GOA', cx, cy, R + 115, -Math.PI / 2, '700 40px sans-serif', CREAM, 2);
  ctx.fillStyle = PINK;
  ctx.textAlign = 'center';
  ctx.font = '700 26px sans-serif';
  ctx.fillText('2026', cx, 50);

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, H - 128, W, 128);
  ctx.fillStyle = GREEN;
  ctx.font = '500 15px sans-serif';
  ctx.fillText(TAGLINE, cx, H - 92);
  ctx.font = '600 26px sans-serif';
  ctx.fillText(DATE_LINE, cx, H - 56);
  ctx.fillStyle = PINK;
  ctx.font = '700 26px sans-serif';
  ctx.fillText(HASHTAG, cx, H - 22);
}

function renderPostmark(ctx, photo) {
  const cx = W / 2, cy = 540, R = 300;

  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);

  // brand-color stamp border, not travel-cliche red/blue
  const stripeH = 26;
  let stripeIndex = 0;
  for (const y of [0, H - stripeH]) {
    stripeIndex = 0;
    for (let x = -40; x < W + 40; x += 60) {
      ctx.fillStyle = stripeIndex % 2 === 0 ? GREEN : PINK;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, 30, stripeH);
      ctx.clip();
      ctx.fillRect(x - 10, y, 50, stripeH);
      ctx.restore();
      stripeIndex++;
    }
  }

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

  const px = cx + R * 0.62, py = cy + R * 0.62, pr = 90;
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PINK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px, py, pr - 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = GREEN;
  ctx.textAlign = 'center';
  ctx.font = '700 16px sans-serif';
  ctx.fillText('GOA', px, py - 6);
  ctx.fillText('INDIA', px, py + 12);
  ctx.font = '600 12px sans-serif';
  ctx.fillText('OCT 2026', px, py + 30);

  ctx.fillStyle = GREEN;
  ctx.font = '700 44px serif';
  ctx.fillText('HACKER HOUSE GOA', cx, 150);
  ctx.fillStyle = PINK;
  ctx.font = '700 24px serif';
  ctx.fillText('2026 · GOA, INDIA', cx, 186);

  ctx.fillStyle = GREEN;
  ctx.font = '500 14px sans-serif';
  ctx.fillText(TAGLINE, cx, H - 96);
  ctx.font = '600 22px sans-serif';
  ctx.fillText(DATE_LINE, cx, H - 64);
  ctx.fillStyle = PINK;
  ctx.font = '700 22px sans-serif';
  ctx.fillText(HASHTAG, cx, H - 36);
}

function renderPlaylist(ctx, photo) {
  const cx = W / 2, cy = 470, R = 260;

  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, W, H);

  // vinyl record: dark disc with concentric grooves behind the photo label
  ctx.fillStyle = NAVY;
  ctx.beginPath();
  ctx.arc(cx, cy, R + 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(244,236,216,0.15)';
  for (let r = R + 15; r <= R + 55; r += 8) {
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // photo as the record label
  drawPhoto(ctx, photo, cx, cy, R);
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // center spindle hole
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = 2;
  ctx.stroke();

  // tonearm
  ctx.save();
  ctx.translate(cx + R + 90, cy - R - 30);
  ctx.rotate((28 * Math.PI) / 180);
  ctx.fillStyle = YELLOW;
  ctx.fillRect(-6, 0, 12, 130);
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = CREAM;
  ctx.textAlign = 'center';
  ctx.font = '700 44px sans-serif';
  ctx.fillText('HACKER HOUSE GOA', cx, 90);
  ctx.fillStyle = PINK;
  ctx.font = '700 24px sans-serif';
  ctx.fillText('NOW PLAYING · 2026', cx, 126);

  // playlist strip
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, H - 220, W, 220);
  ctx.textAlign = 'left';
  ctx.fillStyle = GREEN;
  ctx.font = '700 22px monospace';
  const tracks = ['01. BUILD', '02. SHIP', '03. REPEAT'];
  tracks.forEach((t, i) => {
    ctx.fillText(t, 90, H - 170 + i * 30);
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = GREEN;
  ctx.font = '500 14px sans-serif';
  ctx.fillText(TAGLINE, cx, H - 66);
  ctx.font = '600 22px sans-serif';
  ctx.fillText(DATE_LINE, cx, H - 38);
  ctx.fillStyle = PINK;
  ctx.font = '700 20px sans-serif';
  ctx.fillText(HASHTAG, cx, H - 14);
}

const THEMES = {
  signal: renderSignal,
  postmark: renderPostmark,
  playlist: renderPlaylist,
};

// --- illustrated templates (radio, postcard, map) ---
// these composite the user's photo into a pre-built illustration whose
// circular "hole" was made transparent by scripts/prepare-frame-templates.js
const fs = require('fs');
const path = require('path');
const frameMeta = require('../public/frames/meta.json');

const templateCache = {};
async function loadTemplate(name) {
  if (!templateCache[name]) {
    const buf = fs.readFileSync(path.join(process.cwd(), 'public', 'frames', `${name}.png`));
    templateCache[name] = await loadImage(buf);
  }
  return templateCache[name];
}

async function renderIllustrated(name, photo) {
  const meta = frameMeta[name];
  const canvas = createCanvas(W, W);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  drawPhoto(ctx, photo, meta.cx, meta.cy, meta.r);

  const template = await loadTemplate(name);
  ctx.drawImage(template, 0, 0, W, W);

  return canvas.toBuffer('image/png');
}

const ILLUSTRATED_THEMES = ['radio', 'postcard', 'map'];

async function renderFrame(photoBuffer, theme = 'signal') {
  const photo = await loadImage(photoBuffer);

  if (ILLUSTRATED_THEMES.includes(theme)) {
    return renderIllustrated(theme, photo);
  }

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const renderer = THEMES[theme] || THEMES.signal;
  renderer(ctx, photo);

  return canvas.toBuffer('image/png');
}

function isLowResolution(width, height, minDiameterPx = 500) {
  return Math.min(width, height) < minDiameterPx;
}

module.exports = { renderFrame, isLowResolution };
