export const metadata = {
  title: 'HH Goa 2026 — Make your frame',
  description: 'Turn your photo into an official Hacker House Goa 2026 signal frame.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#0b3d2e' }}>
        {children}
      </body>
    </html>
  );
}
