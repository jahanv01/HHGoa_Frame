'use client';

import { useState, useRef } from 'react';

const CREAM = '#f4ecd8';
const PINK = '#e8477a';
const GREEN = '#0b3d2e';

export default function Home() {
  const [status, setStatus] = useState('idle'); // idle | converting | generating | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    setErrorMsg('');
    setResult(null);

    let toUpload = file;

    // iPhone HEIC photos need client-side conversion before the canvas
    // library on the server can decode them.
    const isHeic =
      /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name || '');
    if (isHeic) {
      try {
        setStatus('converting');
        const heic2any = (await import('heic2any')).default;
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
        toUpload = new File([converted], 'photo.jpg', { type: 'image/jpeg' });
      } catch (err) {
        setStatus('error');
        setErrorMsg("Couldn't convert that HEIC photo. Try a JPG or PNG instead.");
        return;
      }
    }

    setStatus('generating');
    try {
      const fd = new FormData();
      fd.append('photo', toUpload);
      const res = await fetch('/api/generate', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setResult(data);
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Something went wrong. Try again.');
    }
  }

  const shareUrl =
    result && typeof window !== 'undefined'
      ? `${window.location.origin}${result.shareUrl}`
      : '';

  const tweetText = encodeURIComponent(
    "I'm building at Hacker House Goa 2026 🇮🇳 #FrameInGoa"
  );
  const tweetUrl = result
    ? `https://twitter.com/intent/tweet?text=${tweetText}&url=${encodeURIComponent(shareUrl)}`
    : '';

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 16px 64px',
        color: CREAM,
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: 28, margin: '8px 0 4px' }}>HACKER HOUSE GOA</h1>
      <p style={{ color: PINK, margin: '0 0 32px', fontWeight: 700 }}>2026</p>

      {status !== 'done' && (
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            width: '100%',
            maxWidth: 360,
            aspectRatio: '1',
            border: `2px dashed ${CREAM}`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginBottom: 24,
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.heic,.heif"
            onChange={(e) => handleFile(e.target.files?.[0])}
            style={{ display: 'none' }}
          />
          <span style={{ padding: 24 }}>
            {status === 'converting' && 'Converting photo…'}
            {status === 'generating' && 'Building your frame…'}
            {(status === 'idle' || status === 'error') && 'Tap to upload your photo'}
          </span>
        </div>
      )}

      {status === 'error' && (
        <p style={{ color: PINK, maxWidth: 320 }}>{errorMsg}</p>
      )}

      {status === 'done' && result && (
        <>
          <img
            src={result.imageUrl}
            alt="Your Hacker House Goa 2026 frame"
            style={{ width: '100%', maxWidth: 360, borderRadius: 16, marginBottom: 20 }}
          />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <a
              href={result.imageUrl}
              download="hh-goa-2026-frame.png"
              style={{
                background: CREAM,
                color: GREEN,
                padding: '12px 20px',
                borderRadius: 8,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Download
            </a>
            <a
              href={tweetUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                background: PINK,
                color: CREAM,
                padding: '12px 20px',
                borderRadius: 8,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Share to X
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
              borderRadius: 8,
            }}
          >
            Make another
          </button>
        </>
      )}
    </main>
  );
}
