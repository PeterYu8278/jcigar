import type { Handler } from '@netlify/functions';
import { consumeGeminiQuota, errorResponse, HttpError, requireUser } from '../lib/security';

export const handler: Handler = async event => {
  try {
    if (!['GET', 'POST'].includes(event.httpMethod)) throw new HttpError(405, 'Method not allowed');
    const user = await requireUser(event);
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new HttpError(503, 'Server AI key is not configured');
    const version = event.queryStringParameters?.version || 'v1beta';
    if (!['v1', 'v1beta'].includes(version)) throw new HttpError(400, 'Invalid API version');
    let path = 'models';
    let body: string | undefined;
    if (event.httpMethod === 'POST') {
      const model = event.queryStringParameters?.model || '';
      if (!/^gemini-[a-zA-Z0-9.-]{1,100}$/.test(model)) throw new HttpError(400, 'Invalid model');
      if (!event.body || Buffer.byteLength(event.body) > 4_000_000) throw new HttpError(413, 'Invalid request size');
      let payload;
      try { payload = JSON.parse(event.body); } catch { throw new HttpError(400, 'Invalid JSON'); }
      if (!Array.isArray(payload.contents) || payload.contents.length !== 1) throw new HttpError(400, 'One content item required');
      const parts = payload.contents[0]?.parts;
      if (!Array.isArray(parts) || parts.length < 1 || parts.length > 8) throw new HttpError(400, 'Invalid content');
      const safeParts = parts.map((part: any) => {
        if (typeof part.text === 'string' && part.text.length <= 50_000) return { text: part.text };
        const image = part.inlineData;
        if (image && ['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType) && typeof image.data === 'string' && /^[A-Za-z0-9+/=]+$/.test(image.data)) {
          return { inlineData: { mimeType: image.mimeType, data: image.data } };
        }
        throw new HttpError(400, 'Only text and inline images are supported');
      });
      body = JSON.stringify({ contents: [{ role: 'user', parts: safeParts }], generationConfig: { maxOutputTokens: 2048, candidateCount: 1 } });
      path = `models/${model}:generateContent`;
    }
    await consumeGeminiQuota(user.uid);
    const upstream = await fetch(`https://generativelanguage.googleapis.com/${version}/${path}`, {
      method: event.httpMethod,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body, signal: AbortSignal.timeout(45_000),
    });
    if (!upstream.ok) throw new HttpError(upstream.status === 429 ? 429 : 502, 'AI provider request failed');
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: await upstream.text() };
  } catch (error) { return errorResponse(error); }
};
