import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { renderFrame } from '../../../lib/renderFrame';

export const runtime = 'nodejs';

export async function POST(req) {
  const form = await req.formData();
  const file = form.get('photo');
  if (!file) {
    return Response.json({ error: 'No photo uploaded' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const photoBuffer = Buffer.from(arrayBuffer);

  let pngBuffer;
  try {
    pngBuffer = await renderFrame(photoBuffer);
  } catch (err) {
    return Response.json(
      { error: 'Could not read that image. Try a JPG or PNG.' },
      { status: 400 }
    );
  }

  const id = nanoid(10);

  const blob = await put(`shares/${id}.png`, pngBuffer, {
    access: 'public',
    contentType: 'image/png',
    addRandomSuffix: false,
  });

  return Response.json({
    id,
    imageUrl: blob.url,
    shareUrl: `/s/${id}`,
  });
}
