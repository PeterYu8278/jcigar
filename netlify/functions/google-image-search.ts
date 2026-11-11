import type { Handler } from '@netlify/functions';
import { consumeGeminiQuota, errorResponse, HttpError, requireUser } from '../lib/security';

export const handler: Handler = async event => {
  try {
    if (event.httpMethod !== 'GET') throw new HttpError(405, 'Method not allowed');
    const user = await requireUser(event);
    const key = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;
    if (!key || !cx) throw new HttpError(503, 'Image search is not configured');
    const q = event.queryStringParameters?.q || '';
    if (!q.trim() || q.length > 500) throw new HttpError(400, 'Invalid query');
    const requested = Number(event.queryStringParameters?.num || 10);
    if (!Number.isInteger(requested) || requested < 1 || requested > 10) throw new HttpError(400, 'Invalid result count');
    await consumeGeminiQuota(user.uid);
    const params = new URLSearchParams({ key, cx, q, num: String(requested), searchType: 'image', safe: 'active', imgType: 'photo', imgColorType: 'color', fileType: 'jpg,png,webp' });
    const upstream = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, { signal: AbortSignal.timeout(15_000) });
    if (!upstream.ok) throw new HttpError(502, 'Image search failed');
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: await upstream.text() };
  } catch (error) { return errorResponse(error); }
};
