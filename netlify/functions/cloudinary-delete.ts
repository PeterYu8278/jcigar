import type { Handler } from '@netlify/functions';
import { createHash } from 'node:crypto';
import { errorResponse, HttpError, requireUser } from '../lib/security';

export const handler: Handler = async event => {
  try {
    if (event.httpMethod !== 'POST') throw new HttpError(405, 'Method not allowed');
    await requireUser(event, true);
    let payload;
    try { payload = JSON.parse(event.body || '{}'); } catch { throw new HttpError(400, 'Invalid JSON'); }
    const { publicId, resourceType = 'image', invalidate = false } = payload;
    if (typeof publicId !== 'string' || !publicId || publicId.length > 255 || !['image', 'video', 'raw'].includes(resourceType) || typeof invalidate !== 'boolean') throw new HttpError(400, 'Invalid resource');
    const secret = process.env.CLOUDINARY_API_SECRET;
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const key = process.env.CLOUDINARY_API_KEY;
    if (!secret || !cloud || !key) throw new HttpError(503, 'Server media configuration missing');
    const params: Record<string, string> = { public_id: publicId, timestamp: String(Math.floor(Date.now() / 1000)) };
    if (invalidate) params.invalidate = 'true';
    const signature = createHash('sha1').update(Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + secret).digest('hex');
    const upstream = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/${resourceType}/destroy`, {
      method: 'POST', body: new URLSearchParams({ ...params, signature, api_key: key }), signal: AbortSignal.timeout(15_000),
    });
    if (!upstream.ok) throw new HttpError(502, 'Media deletion failed');
    const data = await upstream.json();
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify({ result: data.result, public_id: publicId }) };
  } catch (error) { return errorResponse(error); }
};
