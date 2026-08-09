'use client';

import { useState, useRef, useEffect } from 'react';

const CREAM = '#f4ecd8';
const PINK = '#e8477a';
const GREEN = '#0b3d2e';
const GREEN_DARK = '#062a20';
const AMBER = '#f2c53d';

const STATUS_TEXT = {
  idle: 'AWAITING SIGNAL',
  converting: 'DECODING TRANSMISSION…',
  generating: 'TUNING FREQUENCY…',
  done: 'LOCKED — 106.2 FM',
  error: 'SIGNAL LOST',
};

const THEMES = [
  { id: 'signal', label: 'SIGNAL', desc: 'Tuner dial + waveform' },
  { id: 'postmark', label: 'POSTMARK', desc: 'Airmail stamp style' },
  { id: 'boarding', label: 'BOARDING', desc: 'Ticket / gate pass' },
];

function VUMeter({ active }) {
  const bars = new Array(12).fill(0);
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 40, margin: '16px 0' }}>
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

export default function Home() {
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [dial, setDial] = useState(0);
  const [theme, setTheme] = useState('signal');
  const [lowResWarning, setLowResWarning] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setDial((d) => (d + 1) % 1000), 80);
    return () => clearInterval(t);
  }, []);

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

    // quick client-side resolution check so the user knows *before*
    // downloading a soft result, not after
    try {
      const dims = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = reject;
        img.src = URL.createObjectURL(toUpload);
      });
      if (Math.min(dims.w, dims.h) < 500) setLowResWarning(true);
    } catch {
      // non-fatal — if we can't preflight it, just proceed
    }

    setStatus('generating');
    try {
      const fd = new FormData();
      fd.append('photo', toUpload);
      fd.append('theme', theme);
      const res = await fetch('/api/generate', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setResult(data);
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg((err.message || 'SOMETHING WENT WRONG').toUpperCase());
    }
  }

  const shareUrl =
    result && typeof window !== 'undefined' ? `${window.location.origin}${result.shareUrl}` : '';
  const tweetText = encodeURIComponent("I'm building at Hacker House Goa 2026 🇮🇳 #FrameInGoa");
  const tweetUrl = result
    ? `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(shareUrl)}`
    : '';

  const busy = status === 'converting' || status === 'generating';

  return (
    <>
      <style>{`
        @keyframes vu { from { height: 4px; } to { height: 36px; } }
        @keyframes flicker { 0%,100%{opacity:1} 50%{opacity:0.96} }
        @keyframes scan { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }
        .console { position:relative; overflow:hidden; }
        .console::before {
          content:''; position:absolute; inset:0; pointer-events:none;
          background: repeating-linear-gradient(0deg, rgba(244,236,216,0.05) 0px, rgba(244,236,216,0.05) 1px, transparent 1px, transparent 3px);
          animation: flicker 6s infinite;
        }
        .scanbeam {
          position:absolute; left:0; right:0; height:120px; pointer-events:none;
          background: linear-gradient(180deg, transparent, rgba(242,197,61,0.06), transparent);
          animation: scan 5s linear infinite;
        }
      `}</style>
      <main
        className="console"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '32px 16px 64px',
          color: CREAM,
          textAlign: 'center',
          background: GREEN,
          fontFamily: 'monospace',
        }}
      >
        <div className="scanbeam" />

        <div style={{ fontSize: 13, letterSpacing: 2, color: AMBER, marginBottom: 4 }}>
          HH GOA RADIO · EST. 2026
        </div>
        <h1 style={{ fontSize: 26, margin: '4px 0', letterSpacing: 1 }}>HACKER HOUSE GOA</h1>
        <p style={{ color: PINK, margin: '0 0 8px', fontWeight: 700, letterSpacing: 3 }}>2026</p>
        <p style={{ fontSize: 11, color: CREAM, opacity: 0.6, margin: '0 0 24px' }}>
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
          }}
        >
          {status === 'idle' && `FREQ 10${(dial % 10)}.${dial % 10} MHz — SCANNING`}
          {status !== 'idle' && STATUS_TEXT[status]}
        </div>

        {status !== 'done' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => !busy && setTheme(t.id)}
                disabled={busy}
                style={{
                  background: theme === t.id ? AMBER : 'transparent',
                  color: theme === t.id ? GREEN : CREAM,
                  border: `1px solid ${AMBER}`,
                  borderRadius: 6,
                  padding: '8px 14px',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  letterSpacing: 1,
                  cursor: busy ? 'default' : 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 700 }}>{t.label}</div>
                <div style={{ opacity: 0.8, fontSize: 10 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        )}

        {status !== 'done' && (
          <div
            onClick={() => !busy && inputRef.current?.click()}
            style={{
              width: '100%',
              maxWidth: 340,
              aspectRatio: '1',
              border: `3px solid ${CREAM}`,
              borderRadius: '50%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: busy ? 'default' : 'pointer',
              marginBottom: 12,
              background: GREEN_DARK,
              boxShadow: `0 0 0 6px ${GREEN}, 0 0 0 8px ${PINK}`,
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.heic,.heif"
              onChange={(e) => handleFile(e.target.files?.[0])}
              style={{ display: 'none' }}
              disabled={busy}
            />
            {busy ? (
              <VUMeter active />
            ) : (
              <span style={{ padding: 24, fontSize: 14, letterSpacing: 1 }}>
                TAP TO INSERT PHOTO
              </span>
            )}
          </div>
        )}

        {status === 'error' && (
          <p style={{ color: PINK, maxWidth: 320, fontSize: 13, letterSpacing: 1 }}>{errorMsg}</p>
        )}

        {lowResWarning && (status === 'generating' || status === 'done') && (
          <p style={{ color: AMBER, maxWidth: 320, fontSize: 12, letterSpacing: 0.5, marginBottom: 12 }}>
            HEADS UP: THAT PHOTO IS LOW RESOLUTION — RESULT MAY LOOK SOFT
          </p>
        )}

        {status === 'done' && result && (
          <>
            <div
              style={{
                border: `3px solid ${AMBER}`,
                borderRadius: 16,
                padding: 6,
                marginBottom: 20,
                boxShadow: `0 0 0 4px ${GREEN_DARK}`,
              }}
            >
              <img
                src={result.imageUrl}
                alt="Your Hacker House Goa 2026 frame"
                style={{ width: '100%', maxWidth: 340, borderRadius: 10, display: 'block' }}
              />
            </div>
            <VUMeter active={false} />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <a
                href={result.imageUrl}
                download="hh-goa-2026-frame.png"
                style={{
                  background: CREAM,
                  color: GREEN,
                  padding: '12px 20px',
                  borderRadius: 6,
                  fontWeight: 700,
                  textDecoration: 'none',
                  letterSpacing: 1,
                  fontSize: 13,
                }}
              >
                ↓ DOWNLOAD
              </a>
              <a
                href={tweetUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: PINK,
                  color: CREAM,
                  padding: '12px 20px',
                  borderRadius: 6,
                  fontWeight: 700,
                  textDecoration: 'none',
                  letterSpacing: 1,
                  fontSize: 13,
                }}
              >
                BROADCAST TO X
              </a>
            </div>
            <button
              onClick={() => {
                setStatus('idle');
                setResult(null);
              }}
              style={{
                marginTop: 20,
                background: 'transparent',
                color: CREAM,
                border: `1px solid ${CREAM}`,
                padding: '10px 16px',
                borderRadius: 6,
                fontFamily: 'monospace',
                fontSize: 12,
                letterSpacing: 1,
              }}
            >
              ⟲ RETUNE
            </button>
          </>
        )}
      </main>
    </>
  );
}
