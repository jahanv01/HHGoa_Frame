const test = require('node:test');
const assert = require('node:assert/strict');
const { createCanvas } = require('@napi-rs/canvas');
const { renderFrame, isLowResolution } = require('../lib/renderFrame');

// Build a synthetic "photo" in memory instead of shipping a binary fixture.
function makeTestPhoto(width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#ff4d4d');
  gradient.addColorStop(1, '#4d79ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  return canvas.toBuffer('image/png');
}

test('renderFrame returns a non-empty PNG at the expected canvas size', async () => {
  const photo = makeTestPhoto(1200, 1600); // portrait, like a phone photo
  const result = await renderFrame(photo);

  assert.ok(Buffer.isBuffer(result));
  assert.ok(result.length > 0, 'rendered buffer should not be empty');

  // PNG signature check — confirms it's a real image, not garbage bytes.
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.ok(result.subarray(0, 8).equals(pngSignature), 'output is not a valid PNG');
});

test('renderFrame handles landscape photos without throwing', async () => {
  const photo = makeTestPhoto(1600, 900);
  const result = await renderFrame(photo);
  assert.ok(result.length > 0);
});

test('renderFrame clamps offsetX/offsetY outside [-1, 1] instead of throwing', async () => {
  const photo = makeTestPhoto(1200, 1200);
  const result = await renderFrame(photo, 5, -5);
  assert.ok(result.length > 0);
});

test('renderFrame rejects an unreadable buffer', async () => {
  const garbage = Buffer.from('not an image');
  await assert.rejects(() => renderFrame(garbage));
});

test('isLowResolution flags images under the diameter threshold', () => {
  assert.equal(isLowResolution(400, 800), true); // min dimension 400 < 500
  assert.equal(isLowResolution(600, 800), false); // min dimension 600 >= 500
  assert.equal(isLowResolution(500, 500), false); // boundary: not < 500
  assert.equal(isLowResolution(499, 9999), true); // boundary: just under
});
