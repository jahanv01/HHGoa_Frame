import { handleUpload } from '@vercel/blob/client';

export const runtime = 'nodejs';

export async function POST(request) {
  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/heic',
          'image/heif',
          'image/gif',
          'image/bmp',
        ],
        // final share images use a fixed pathname (shares/<id>.png) so the
        // /s/[id] page can look them up exactly; raw uploads get a random
        // suffix to avoid collisions between different people's uploads
        addRandomSuffix: !pathname.startsWith('shares/'),
        maximumSizeInBytes: 30 * 1024 * 1024,
      }),
      onUploadCompleted: async () => {
        // no server-side action needed once the raw photo lands in Blob —
        // /api/generate picks it up from the URL the client receives
      },
    });
    return Response.json(jsonResponse);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
