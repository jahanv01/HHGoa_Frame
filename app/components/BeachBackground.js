// Goa beach background — flat brand-color version.
//
// Deliberately different from the earlier draft: no sky gradient cycling,
// no sunrise/sunset color blending, no progress-driven color tinting. Colors
// stay flat and constant the whole time — only motion (waves, boats)
// animates. This matches the brand reference exactly: green / yellow / pink,
// no blended or muddy in-between tones.
//
// `progress` prop is still accepted (page.js already passes it) but is no
// longer used for anything — kept only so the existing call site in
// page.js doesn't need another edit.

const GREEN = '#026735';
const GREEN_LIGHT = '#0F7547'; // sea — a genuinely lighter tint of the brand green, not a new color family
const YELLOW = '#FEE101';
const PINK = '#FF0081';
const LINE = '#ffffff';

function WaveTile({ opacity }) {
  return (
    <svg
      viewBox="0 0 1000 120"
      preserveAspectRatio="none"
      style={{ width: '200%', height: '100%', display: 'block' }}
      aria-hidden="true"
    >
      <path
        d="M0,50 C125,90 250,10 375,50 C500,90 625,10 750,50 C875,90 950,30 1000,50
           L1000,120 L0,120 Z
           M1000,50 C1125,90 1250,10 1375,50 C1500,90 1625,10 1750,50 C1875,90 1950,30 2000,50
           L2000,120 L1000,120 Z"
        fill={LINE}
        opacity={opacity}
      />
    </svg>
  );
}

// Small flat-style boat: hull + mast + single sail. Pink fill with a white
// outline, per brand spec. Kept intentionally simple/understated — not a
// detailed illustration.
function Boat({ scale = 1 }) {
  return (
    <svg viewBox="0 0 60 40" style={{ width: 60 * scale, height: 40 * scale, display: 'block' }} aria-hidden="true">
      <path d="M6,30 L54,30 L46,38 L14,38 Z" fill={PINK} stroke={LINE} strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="29" y="6" width="2" height="24" fill={LINE} />
      <path d="M31,8 L48,28 L31,28 Z" fill={PINK} stroke={LINE} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// Each boat: vertical position within the sea band, size, animation
// duration (speed), and a start delay so they don't all launch in sync.
const BOATS = [
  { bottom: '6vh', scale: 0.9, duration: 34, delay: 0 },
  { bottom: '3vh', scale: 0.7, duration: 46, delay: -18 },
  { bottom: '1vh', scale: 1.05, duration: 40, delay: -30 },
];

// Flat white puffy cloud — a few overlapping ellipses, no gradient/shadow.
function Cloud({ scale = 1 }) {
  return (
    <svg viewBox="0 0 120 50" style={{ width: 120 * scale, height: 50 * scale, display: 'block' }} aria-hidden="true">
      <ellipse cx="30" cy="34" rx="26" ry="14" fill={LINE} opacity="0.9" />
      <ellipse cx="60" cy="24" rx="30" ry="18" fill={LINE} opacity="0.9" />
      <ellipse cx="92" cy="32" rx="24" ry="13" fill={LINE} opacity="0.9" />
    </svg>
  );
}

// Simple two-stroke "seagull" bird — flat black silhouette, classic flat
// icon style rather than a detailed illustration.
function Bird({ scale = 1 }) {
  return (
    <svg viewBox="0 0 40 16" style={{ width: 40 * scale, height: 16 * scale, display: 'block' }} aria-hidden="true">
      <path
        d="M2,12 C8,2 12,2 20,10 C28,2 32,2 38,12"
        fill="none"
        stroke="#111111"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Clouds drift slower than boats (they're further away); each has its own
// altitude (top, in vh from the top of the viewport), size, and speed.
const CLOUDS = [
  { top: '6vh', scale: 0.9, duration: 85, delay: 0 },
  { top: '13vh', scale: 0.6, duration: 110, delay: -40 },
  { top: '9vh', scale: 0.75, duration: 95, delay: -70 },
];

const BIRDS = [{ top: '17vh', scale: 1, duration: 30, delay: 0 }];

export default function BeachBackground() {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes beach-wave-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes beach-wave-bob {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-4px); }
        }
        @keyframes beach-boat-drift {
          from { transform: translateX(-15vw); }
          to   { transform: translateX(115vw); }
        }
        @keyframes beach-sky-drift {
          from { transform: translateX(-20vw); }
          to   { transform: translateX(120vw); }
        }
        @keyframes beach-scan {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes beach-rays-pulse {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 0.85; }
        }
        @keyframes beach-sun-arc {
          0%   { left: 12%; top: 62%; }
          50%  { left: 50%; top: 20%; }
          100% { left: 88%; top: 62%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .beach-wave-track, .beach-boat, .beach-rays, .beach-sun, .beach-cloud, .beach-bird {
            animation: none !important;
          }
        }
      `,
        }}
      />

      {/* Flat sky — constant color, no gradient */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: GREEN }} />

      {/* Sun: flat yellow circle, arcs slowly from sunrise (low left) to sunset (low right) and back. Color never changes — only position. */}
      <div
        className="beach-sun"
        style={{
          position: 'fixed',
          left: '12%',
          top: '62%',
          zIndex: 1,
          width: 150,
          height: 150,
          marginLeft: -75,
          marginTop: -75,
          animation: 'beach-sun-arc 110s ease-in-out infinite alternate',
        }}
      >
        <svg viewBox="0 0 150 150" style={{ width: '100%', height: '100%' }} aria-hidden="true">
          <g className="beach-rays" style={{ animation: 'beach-rays-pulse 6s ease-in-out infinite' }} stroke={YELLOW} strokeWidth="3" strokeLinecap="round">
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x1 = 75 + Math.cos(angle) * 68;
              const y1 = 75 + Math.sin(angle) * 68;
              const x2 = 75 + Math.cos(angle) * 82;
              const y2 = 75 + Math.sin(angle) * 82;
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
            })}
          </g>
          <circle cx="75" cy="75" r="55" fill={YELLOW} />
        </svg>
      </div>

      {/* Clouds — slow drift, upper sky, above the sun's arc */}
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="beach-cloud"
          style={{
            position: 'fixed',
            left: 0,
            top: c.top,
            zIndex: 1.5,
            animation: `beach-sky-drift ${c.duration}s linear infinite`,
            animationDelay: `${c.delay}s`,
          }}
        >
          <Cloud scale={c.scale} />
        </div>
      ))}

      {/* Bird — faster drift, same altitude band as the clouds */}
      {BIRDS.map((b, i) => (
        <div
          key={i}
          className="beach-bird"
          style={{
            position: 'fixed',
            left: 0,
            top: b.top,
            zIndex: 1.5,
            animation: `beach-sky-drift ${b.duration}s linear infinite`,
            animationDelay: `${b.delay}s`,
          }}
        >
          <Bird scale={b.scale} />
        </div>
      ))}

      {/* Sea band — flat color, slightly different shade from sky for depth */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: '20vh',
          zIndex: 2,
          background: GREEN_LIGHT,
        }}
      />

      {/* Boats — drift left to right only, loop, never reverse */}
      {BOATS.map((b, i) => (
        <div
          key={i}
          className="beach-boat"
          style={{
            position: 'fixed',
            left: 0,
            bottom: b.bottom,
            zIndex: 3,
            animation: `beach-boat-drift ${b.duration}s linear infinite`,
            animationDelay: `${b.delay}s`,
          }}
        >
          <Boat scale={b.scale} />
        </div>
      ))}

      {/* Wave layers — back to front */}
      <div
        className="beach-wave-track"
        style={{
          position: 'fixed',
          left: 0,
          bottom: '1vh',
          width: '200%',
          height: '8vh',
          zIndex: 4,
          display: 'flex',
          animation: 'beach-wave-scroll 26s linear infinite',
        }}
      >
        <WaveTile opacity={0.35} />
      </div>
      <div
        className="beach-wave-track"
        style={{
          position: 'fixed',
          left: 0,
          bottom: '0vh',
          width: '200%',
          height: '7vh',
          zIndex: 5,
          display: 'flex',
          animation: 'beach-wave-scroll 18s linear infinite reverse',
        }}
      >
        <WaveTile opacity={0.5} />
      </div>
      <div
        className="beach-wave-track"
        style={{
          position: 'fixed',
          left: 0,
          bottom: '-0.5vh',
          width: '200%',
          height: '5vh',
          zIndex: 6,
          display: 'flex',
          animation: 'beach-wave-scroll 12s linear infinite, beach-wave-bob 4s ease-in-out infinite',
        }}
      >
        <WaveTile opacity={0.7} />
      </div>

      {/* Legibility overlay for foreground UI text */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 7, background: 'rgba(2, 30, 18, 0.35)' }} />

      {/* Scanbeam accent, kept from original design */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          top: 0,
          height: 120,
          zIndex: 8,
          pointerEvents: 'none',
          background: `linear-gradient(180deg, transparent, rgba(254,225,1,0.06), transparent)`,
          animation: 'beach-scan 5s linear infinite',
        }}
      />
    </>
  );
}
