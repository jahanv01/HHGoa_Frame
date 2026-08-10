import { head } from '@vercel/blob';

async function getImageUrl(id) {
  try {
    const info = await head(`shares/${id}.png`);
    return info.url;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const imageUrl = await getImageUrl(params.id);

  if (!imageUrl) {
    return {
      title: 'HH Goa 2026 — Frame not found',
      description: 'Hacker House Goa 2026',
    };
  }

  return {
    title: 'Hacker House Goa 2026',

    description:
      'Goa, code, and a little chaos 🌴💻 Just framed my Hacker House Goa 2026 moment. Less noise. More signal. #FrameInGoa',

    openGraph: {
      title: 'Hacker House Goa 2026',

      description:
        'Goa, code, and a little chaos 🌴💻 Just framed my Hacker House Goa 2026 moment. Less noise. More signal. #FrameInGoa',

      type: 'website',

      images: [
        {
          url: imageUrl,
          width: 1080,
          height: 1080,
          alt: 'Hacker House Goa 2026 frame',
        },
      ],
    },

    twitter: {
      card: 'summary_large_image',

      title: 'Hacker House Goa 2026',

      description:
        'Goa, code, and a little chaos 🌴💻 Just framed my Hacker House Goa 2026 moment. Less noise. More signal. #FrameInGoa',

      images: [imageUrl],
    },
  };
}

export default async function SharePage({ params }) {
  const imageUrl = await getImageUrl(params.id);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        color: '#f4ecd8',
        textAlign: 'center',
      }}
    >
      <a href="/" style={{ color: '#f4ecd8', marginBottom: 24 }}>
        ← Make your own
      </a>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Hacker House Goa 2026 builder frame"
          style={{ width: '100%', maxWidth: 380, borderRadius: 16 }}
        />
      ) : (
        <p>This frame couldn&apos;t be found.</p>
      )}
      <a
        href="/"
        style={{
          marginTop: 24,
          background: '#f2c53d',
          color: '#0b3d2e',
          padding: '12px 20px',
          borderRadius: 8,
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        Make yours →
      </a>
    </main>
  );
}
