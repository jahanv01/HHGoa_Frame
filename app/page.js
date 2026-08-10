'use client';

import { useState, useRef, useEffect } from 'react';
import { upload } from '@vercel/blob/client';
import { nanoid } from 'nanoid';

const CREAM = '#f4ecd8';
const PINK = '#e8477a';
const GREEN = '#0b3d2e';
const GREEN_DARK = '#062a20';
const AMBER = '#f2c53d';

const STATUS_TEXT = {
  idle: 'READY TO BUILD',
  converting: 'CONVERTING PHOTO…',
  adjusting: 'DRAG TO ADJUST',
  generating: 'GENERATING FRAME…',
  done: 'FRAME READY',
  error: 'SOMETHING WENT WRONG',
};

const IDLE_MESSAGES = [
  'BREWING COFFEE…',
  'PACKING THE LAPTOP…',
  'WAXING THE SURFBOARD…',
  'OPENING TERMINAL…',
  'CATCHING THE BREEZE…',
];

const TWEET_CAPTION =
  "Goa, code, and a little chaos 🌴💻 Just framed my Hacker House Goa 2026 moment. Less noise. More signal. #FrameInGoa";

const DEFAULT_OFFSET_Y = 0.35; // matches server's DEFAULT_Y_BIAS

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Mirrors the server's compositing math exactly (lib/renderFrame.js) so the
// adjuster preview is a true WYSIWYG of the final generated image.
function computeGeometry(photoDims, frameMeta, zoom) {
  const baseScale = Math.max((frameMeta.r * 2) / photoDims.w, (frameMeta.r * 2) / photoDims.h);
  const scale = baseScale * zoom;
  const iw = photoDims.w * scale;
  const ih = photoDims.h * scale;
  const maxOffsetX = Math.max(0, (iw - frameMeta.r * 2) / 2);
  const maxOffsetY = Math.max(0, (ih - frameMeta.r * 2) / 2);
  return { scale, iw, ih, maxOffsetX, maxOffsetY };
}

function loadImageEl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Same operation as lib/renderFrame.js's renderFrame(), but running in the
// browser's own Canvas API instead of a serverless function — this is what
// makes the result appear instantly instead of waiting on a network round
// trip (upload photo -> function -> composite -> upload result -> fetch
// result back). The server is only involved later, and only for producing
// a public shareable link, not for generating the image itself.
async function compositeFrameLocally(
  photoUrl,
  photoDims,
  frameMeta,
  offsetX,
  offsetY,
  zoom
) {
  const [photoImg, frameImg] = await Promise.all([
    loadImageEl(photoUrl),
    loadImageEl('/frames/main.webp'),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;

  const ctx = canvas.getContext('2d');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const geo = computeGeometry(photoDims, frameMeta, zoom);

  const clampedX = clamp(offsetX, -1, 1);
  const clampedY = clamp(offsetY, -1, 1);

  const drawX =
    frameMeta.cx -
    geo.iw / 2 +
    clampedX * geo.maxOffsetX;

  const drawY =
    frameMeta.cy -
    geo.ih / 2 +
    clampedY * geo.maxOffsetY;

  // ==========================================
  // 1. Clip photo to frame's inner circle
  // ==========================================
  ctx.save();

  ctx.beginPath();
  ctx.arc(
    frameMeta.cx,
    frameMeta.cy,
    frameMeta.r,
    0,
    Math.PI * 2
  );

  ctx.clip();

  // ==========================================
  // 2. Draw uploaded photo
  // ==========================================
  ctx.drawImage(
    photoImg,
    drawX,
    drawY,
    geo.iw,
    geo.ih
  );

  ctx.restore();

  // ==========================================
  // 3. Draw frame on top
  // ==========================================
  ctx.drawImage(
    frameImg,
    0,
    0,
    1080,
    1080
  );

  // ==========================================
  // 4. Convert canvas to PNG
  // ==========================================
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => {
        if (b) {
          resolve(b);
        } else {
          reject(new Error('toBlob failed'));
        }
      },
      'image/png'
    )
  );

  return blob;
}

function Confetti() {
  const colors = [CREAM, PINK, AMBER];
  const pieces = new Array(40).fill(0).map((_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.3,
    duration: 1.6 + Math.random() * 0.9,
    size: 6 + Math.random() * 6,
    color: colors[i % colors.length],
    rotate: Math.random() * 360,
    drift: (Math.random() - 0.5) * 200,
  }));
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {pieces.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: -20,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.5,
            background: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            '--drift': `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

function VUMeter({ active }) {
  const bars = new Array(12).fill(0);
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 40, margin: '16px 0', justifyContent: 'center' }}>
      {bars.map((_, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: active ? undefined : 4,
            background: i < 8 ? AMBER : PINK,
            borderRadius: 1,
            animation: active ? `vu 0.${4 + (i % 5)}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.05}s`,
            opacity: active ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  );
}

function AdjustPanel({ photoUrl, photoDims, frameMeta, offsetX, offsetY, zoom, onChangeOffset, onChangeZoom, onConfirm, onCancel }) {
  const containerRef = useRef(null);
  const dragRef = useRef({ active: false });
  // Measured from the DOM instead of assumed, since the container is
  // `width: 100%, maxWidth: 340` — on screens narrower than 340px (very
  // common on phones) the real rendered width is smaller, and a hardcoded
  // 340 here would desync the photo's position from the frame overlay,
  // which itself always scales to the container's true size via width:100%.
  const [containerWidth, setContainerWidth] = useState(340);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w) setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    function handlePointerMove(e) {
      const d = dragRef.current;
      if (!d.active) return;
      const dxCanvas = (e.clientX - d.startClientX) / d.scaleFactor;
      const dyCanvas = (e.clientY - d.startClientY) / d.scaleFactor;
      const newX = d.maxOffsetX > 0 ? clamp(d.startOffsetX + dxCanvas / d.maxOffsetX, -1, 1) : 0;
      const newY = d.maxOffsetY > 0 ? clamp(d.startOffsetY + dyCanvas / d.maxOffsetY, -1, 1) : 0;
      onChangeOffset(newX, newY);
    }
    function handlePointerUp() {
      dragRef.current.active = false;
    }
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [onChangeOffset]);

  function handlePointerDown(e) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleFactor = rect.width / 1080;
    const geo = computeGeometry(photoDims, frameMeta, zoom);
    dragRef.current = {
      active: true,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startOffsetX: offsetX,
      startOffsetY: offsetY,
      maxOffsetX: geo.maxOffsetX,
      maxOffsetY: geo.maxOffsetY,
      scaleFactor,
    };
  }

  const geo = computeGeometry(photoDims, frameMeta, zoom);
  const scaleFactorForRender = containerWidth / 1080;
  const imgLeft = (frameMeta.cx - geo.iw / 2 + offsetX * geo.maxOffsetX) * scaleFactorForRender;
  const imgTop = (frameMeta.cy - geo.ih / 2 + offsetY * geo.maxOffsetY) * scaleFactorForRender;
  const imgW = geo.iw * scaleFactorForRender;
  const imgH = geo.ih * scaleFactorForRender;


  return (
    <div style={{ width: '100%', maxWidth: 340, margin: '0 auto' }}>
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1',
        overflow: 'hidden',
        touchAction: 'none',
        cursor: 'grab',
        background: '#000',
      }}
    >
      {/* PHOTO WINDOW */}
      <div
        style={{
          position: 'absolute',
          left: `${(frameMeta.cx - frameMeta.r) * scaleFactorForRender}px`,
          top: `${(frameMeta.cy - frameMeta.r) * scaleFactorForRender}px`,
          width: `${frameMeta.r * 2 * scaleFactorForRender}px`,
          height: `${frameMeta.r * 2 * scaleFactorForRender}px`,
          borderRadius: '50%',
          overflow: 'hidden',
        }}
      >
        <img
          src={photoUrl}
          alt="Drag to reposition"
          draggable={false}
          style={{
            position: 'absolute',

            /*
            * Convert the photo's 1080x1080 canvas position
            * into coordinates relative to the circular
            * photo window.
            */
            left: `${(imgLeft - (frameMeta.cx - frameMeta.r) * scaleFactorForRender)}px`,
            top: `${(imgTop - (frameMeta.cy - frameMeta.r) * scaleFactorForRender)}px`,

            width: `${imgW}px`,
            height: `${imgH}px`,

            maxWidth: 'none',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* FRAME */}
      <img
        src="/frames/main.webp"
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </div>

      <p style={{ fontSize: 11, color: CREAM, opacity: 0.7, margin: '10px 0 4px' }}>
        DRAG PHOTO TO REPOSITION
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 16px' }}>
        <span style={{ fontSize: 11, color: CREAM, opacity: 0.7 }}>ZOOM</span>
        <input
          type="range"
          min="1"
          max="2.5"
          step="0.05"
          value={zoom}
          onChange={(e) => onChangeZoom(parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: AMBER }}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button
          onClick={onCancel}
          style={{
            background: 'transparent',
            color: CREAM,
            border: `1px solid ${CREAM}`,
            padding: '12px 18px',
            borderRadius: 6,
            fontFamily: 'monospace',
            fontSize: 12,
            letterSpacing: 1,
            cursor: 'pointer',
          }}
        >
          CHOOSE DIFFERENT
        </button>
        <button
          onClick={onConfirm}
          style={{
            background: AMBER,
            color: GREEN,
            border: 'none',
            padding: '12px 18px',
            borderRadius: 6,
            fontWeight: 700,
            fontFamily: 'monospace',
            fontSize: 12,
            letterSpacing: 1,
            cursor: 'pointer',
          }}
        >
          USE THIS PHOTO →
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [dial, setDial] = useState(0);
  const [lowResWarning, setLowResWarning] = useState(false);
  const [frameMeta, setFrameMeta] = useState(null);
  const [preparingShare, setPreparingShare] = useState(false);
  const [tweetUrl, setTweetUrl] = useState('');
  const [adjustFile, setAdjustFile] = useState(null);
  const [adjustPreviewUrl, setAdjustPreviewUrl] = useState(null);
  const [photoDims, setPhotoDims] = useState(null);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(DEFAULT_OFFSET_Y);
  const [zoom, setZoom] = useState(1);

  const inputRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setDial((d) => (d + 1) % 1000), 80);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch('/frames/main-meta.json')
      .then((r) => r.json())
      .then(setFrameMeta)
      .catch(() => {});
  }, []);

  function resetToIdle() {
    setStatus('idle');
    if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl);
    setResult(null);
    setAdjustFile(null);
    setTweetUrl('');
    if (adjustPreviewUrl) URL.revokeObjectURL(adjustPreviewUrl);
    setAdjustPreviewUrl(null);
    setPhotoDims(null);
    setOffsetX(0);
    setOffsetY(DEFAULT_OFFSET_Y);
    setZoom(1);
    setErrorMsg('');
    setLowResWarning(false);
  }

  // Resets state AND immediately reopens the OS file picker, so "Choose
  // Different" / "Change Photo" go straight to file explorer instead of
  // landing back on the idle screen and requiring a second tap.
  function chooseDifferentPhoto() {
    resetToIdle();
    if (inputRef.current) {
      inputRef.current.value = ''; // otherwise re-picking the same file won't fire onChange
      inputRef.current.click();
    }
  }

  function handleDownload() {
    if (!result?.blob) return;
    // the composited image already exists locally as a Blob — no fetch,
    // no server round trip, just save it
    const blobUrl = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = 'hh-goa-2026-frame.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }

  async function handleFile(file) {
    if (!file) return;
    setErrorMsg('');
    setResult(null);
    setLowResWarning(false);

    let toUpload = file;
    const isHeic = /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name || '');
    if (isHeic) {
      try {
        setStatus('converting');
        const heic2any = (await import('heic2any')).default;
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
        toUpload = new File([converted], 'photo.jpg', { type: 'image/jpeg' });
      } catch (err) {
        setStatus('error');
        setErrorMsg("COULDN'T DECODE THAT FILE — TRY A JPG OR PNG");
        return;
      }
    }

    let sourceImg;
    try {
      sourceImg = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(toUpload);
      });
      const dims = { w: sourceImg.naturalWidth, h: sourceImg.naturalHeight };
      if (Math.min(dims.w, dims.h) < 500) setLowResWarning(true);

      const MAX_DIM = 1600;
      const TARGET_BYTES = 2 * 1024 * 1024;
      let targetDim = Math.min(MAX_DIM, Math.max(dims.w, dims.h));
      let quality = 0.88;
      let finalBlob = null;

      for (let attempt = 0; attempt < 4; attempt++) {
        const scale = targetDim / Math.max(dims.w, dims.h);
        const targetW = Math.round(dims.w * scale);
        const targetH = Math.round(dims.h * scale);
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(sourceImg, 0, 0, targetW, targetH);
        const blob = await new Promise((resolve, reject) =>
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', quality)
        );
        finalBlob = blob;
        if (blob.size <= TARGET_BYTES) break;
        targetDim = Math.round(targetDim * 0.8);
        quality = Math.max(0.5, quality - 0.12);
      }

      if (finalBlob) {
        toUpload = new File([finalBlob], 'photo.jpg', { type: 'image/jpeg' });
      }

      // measure the FINAL (possibly resized) image, since that's what the
      // adjuster and the server both actually operate on
      const finalDims = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = reject;
        img.src = URL.createObjectURL(toUpload);
      });

      setAdjustFile(toUpload);
      setAdjustPreviewUrl(URL.createObjectURL(toUpload));
      setPhotoDims(finalDims);
      setOffsetX(0);
      setOffsetY(DEFAULT_OFFSET_Y);
      setZoom(1);
      setStatus('adjusting');
    } catch (err) {
      setStatus('error');
      setErrorMsg("COULDN'T READ THAT PHOTO — TRY ANOTHER");
    }
  }

  async function handleConfirmAdjust() {
    if (!adjustFile || !adjustPreviewUrl || !photoDims || !frameMeta) return;
    setStatus('generating');
    try {
      const blob = await compositeFrameLocally(
        adjustPreviewUrl, photoDims, frameMeta, offsetX, offsetY, zoom
      );
      const previewUrl = URL.createObjectURL(blob);
      setResult({ blob, previewUrl, sharePath: null });
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg("COULDN'T GENERATE THE FRAME — TRY AGAIN");
    }
  }

  async function handleShare() {
    if (!result?.blob) return;
    setPreparingShare(true);
    setErrorMsg('');
    try {
      let path = result.sharePath;
      if (!path) {
        const id = nanoid(10);
        await upload(`shares/${id}.png`, result.blob, {
          access: 'public',
          handleUploadUrl: '/api/upload-token',
          addRandomSuffix: false,
        });
        path = `/s/${id}`;
        setResult((r) => (r ? { ...r, sharePath: path } : r));
      }
      const fullShareUrl = `${window.location.origin}${path}`;
      setTweetUrl(`https://x.com/intent/post?text=${encodeURIComponent(TWEET_CAPTION)}&url=${encodeURIComponent(fullShareUrl)}`);
    } catch (err) {
      setErrorMsg(`SHARE FAILED: ${err?.message || err}`);
    } finally {
      setPreparingShare(false);
    }
  }

  const busy = status === 'converting' || status === 'generating';

  return (
    <>
      <style>{`
        @keyframes vu { from { height: 4px; } to { height: 36px; } }
        @keyframes scan { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }
        @keyframes confetti-fall {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(700px) translateX(var(--drift)) rotate(540deg); opacity: 0; }
        }
        @keyframes pop-in {
          0% { transform: scale(0.7); opacity: 0; }
          60% { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .result-pop { animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        .bg-layer {
          position: fixed;
          inset: -20px;
          background-image: url('/page-bg.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          filter: blur(10px);
          z-index: 0;
        }
        .bg-overlay {
          position: fixed;
          inset: 0;
          background: rgba(6, 42, 32, 0.8);
          z-index: 1;
        }
        .scanbeam {
          position: fixed; left: 0; right: 0; top:0; height: 120px; pointer-events: none;
          background: linear-gradient(180deg, transparent, rgba(242,197,61,0.06), transparent);
          animation: scan 5s linear infinite;
          z-index: 2;
        }
      `}</style>
      <div className="bg-layer" />
      <div className="bg-overlay" />
      <div className="scanbeam" />
      <main
        style={{
          position: 'relative',
          zIndex: 3,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '32px 16px 64px',
          color: CREAM,
          textAlign: 'center',
          fontFamily: 'monospace',
        }}
      >
        <div style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>

        <img
          src="/header-logo.png"
          alt="Hacker House Goa 2026"
          style={{ width: '100%', maxWidth: 380, height: 'auto', margin: '0 auto 4px', display: 'block' }}
        />
        <p style={{ color: CREAM, margin: '0 0 8px', fontWeight: 700, letterSpacing: 3, fontSize: 15 }}>
          FRAME GENERATOR
        </p>
        <p style={{ fontSize: 11, color: CREAM, opacity: 0.7, margin: '0 0 24px' }}>
          LESS NOISE. MORE SIGNAL.
        </p>

        <div
          style={{
            background: GREEN_DARK,
            border: `1px solid ${AMBER}`,
            borderRadius: 8,
            padding: '10px 20px',
            fontSize: 13,
            color: AMBER,
            marginBottom: 20,
            letterSpacing: 1,
            display: 'inline-block',
          }}
        >
          {status === 'idle' && IDLE_MESSAGES[Math.floor(dial / 25) % IDLE_MESSAGES.length]}
          {status !== 'idle' && STATUS_TEXT[status]}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif"
          onChange={(e) => handleFile(e.target.files?.[0])}
          style={{ display: 'none' }}
          disabled={busy}
        />

        {(status === 'idle' || status === 'converting') && (
          <div
            onClick={() => !busy && inputRef.current?.click()}
            style={{
              width: '100%',
              maxWidth: 340,
              aspectRatio: '1',
              borderRadius: '50%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: busy ? 'default' : 'pointer',
              margin: '0 auto 12px',
              background: 'rgba(6, 42, 32, 0.55)',
            }}
          >
            {busy ? (
              <VUMeter active />
            ) : (
              <span style={{ padding: 24, fontSize: 14, letterSpacing: 1 }}>
                TAP TO INSERT PHOTO
              </span>
            )}
          </div>
        )}

        {status === 'adjusting' && frameMeta && photoDims && adjustPreviewUrl && (
          <AdjustPanel
            photoUrl={adjustPreviewUrl}
            photoDims={photoDims}
            frameMeta={frameMeta}
            offsetX={offsetX}
            offsetY={offsetY}
            zoom={zoom}
            onChangeOffset={(x, y) => { setOffsetX(x); setOffsetY(y); }}
            onChangeZoom={setZoom}
            onConfirm={handleConfirmAdjust}
            onCancel={chooseDifferentPhoto}
          />
        )}

        {status === 'generating' && (
          <div style={{ width: '100%', maxWidth: 340, aspectRatio: '1', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <VUMeter active />
          </div>
        )}

        {(status === 'idle' || status === 'converting') && (
          <>
            <p style={{ fontSize: 11, color: CREAM, opacity: 0.6, margin: '0 0 4px' }}>
              JPG · PNG · HEIC · WEBP
            </p>
            <p style={{ fontSize: 11, color: AMBER, fontWeight: 700, letterSpacing: 1, margin: '0 0 16px' }}>
              ANY SHAPE — WE'LL FRAME IT
            </p>
          </>
        )}

        {(status === 'idle' || status === 'converting') && (
          <p style={{ color: PINK, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>
            #FrameInGoa
          </p>
        )}

        {(status === 'error' || (status === 'done' && errorMsg)) && (
          <p style={{ color: PINK, maxWidth: 320, fontSize: 13, letterSpacing: 1, margin: '0 auto 16px' }}>{errorMsg}</p>
        )}

        {lowResWarning && (status === 'adjusting' || status === 'generating' || status === 'done') && (
          <p style={{ color: AMBER, maxWidth: 320, fontSize: 12, letterSpacing: 0.5, margin: '0 auto 12px' }}>
            HEADS UP: THAT PHOTO IS LOW RESOLUTION — RESULT MAY LOOK SOFT
          </p>
        )}

        {status === 'done' && result && (
          <>
            <Confetti />
            <div
              className="result-pop"
              style={{
                width: '100%',
                maxWidth: 340,
                margin: '0 auto 16px',
              }}
            >
              <img
                src={result.previewUrl}
                alt="Your Hacker House Goa 2026 frame"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>

            <button
              onClick={chooseDifferentPhoto}
              style={{
                background: 'transparent',
                color: CREAM,
                border: `1px solid ${CREAM}`,
                padding: '8px 14px',
                borderRadius: 6,
                fontFamily: 'monospace',
                fontSize: 11,
                letterSpacing: 1,
                cursor: 'pointer',
                marginBottom: 16,
              }}
            >
              ⟲ CHANGE PHOTO
            </button>

            <VUMeter active={false} />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={handleDownload}
                style={{
                  background: CREAM,
                  color: GREEN,
                  padding: '12px 20px',
                  borderRadius: 6,
                  fontWeight: 700,
                  border: 'none',
                  letterSpacing: 1,
                  fontSize: 13,
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                }}
              >
                ↓ DOWNLOAD
              </button>
              {!tweetUrl ? (
                <button
                  onClick={handleShare}
                  disabled={preparingShare}
                  style={{
                    background: PINK,
                    color: CREAM,
                    padding: '12px 20px',
                    borderRadius: 6,
                    fontWeight: 700,
                    border: 'none',
                    letterSpacing: 1,
                    fontSize: 13,
                    fontFamily: 'monospace',
                    cursor: preparingShare ? 'default' : 'pointer',
                  }}
                >
                  {preparingShare ? 'PREPARING…' : 'BROADCAST TO X'}
                </button>
              ) : (
                <a
                  href={tweetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: PINK,
                    color: CREAM,
                    padding: '12px 20px',
                    borderRadius: 6,
                    fontWeight: 700,
                    textDecoration: 'none',
                    letterSpacing: 1,
                    fontSize: 13,
                    fontFamily: 'monospace',
                    display: 'inline-block',
                  }}
                >
                  OPEN X →
                </a>
              )}
            </div>
          </>
        )}
        </div>
      </main>
    </>
  );
}
