// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const security = vi.hoisted(() => ({ requireUser: vi.fn(), consumeGeminiQuota: vi.fn() }));
vi.mock('../lib/security', async importOriginal => ({ ...(await importOriginal<typeof import('../lib/security')>()), ...security }));
import { handler } from '../functions/gemini';
import { HttpError } from '../lib/security';

const call = (overrides: Record<string, unknown> = {}) => (handler as any)({
  httpMethod: 'POST', headers: {}, queryStringParameters: { model: 'gemini-2.5-flash' },
  body: JSON.stringify({ contents: [{ parts: [{ text: 'test' }] }] }), ...overrides,
}, {});

describe('Gemini gateway', () => {
  const upstream = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv('GEMINI_API_KEY', 'server-secret'); vi.stubGlobal('fetch', upstream);
    security.requireUser.mockResolvedValue({ uid: 'member' });
    security.consumeGeminiQuota.mockResolvedValue(undefined);
  });
  it('rejects path traversal before sending a provider request', async () => {
    expect((await call({ queryStringParameters: { model: '../other-service' } })).statusCode).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });
  it('rejects unauthenticated requests before consuming quota or contacting the provider', async () => {
    security.requireUser.mockRejectedValue(new HttpError(401, 'Authentication required'));
    expect((await call()).statusCode).toBe(401);
    expect(security.consumeGeminiQuota).not.toHaveBeenCalled();
    expect(upstream).not.toHaveBeenCalled();
  });
  it('does not call the provider after quota is exhausted', async () => {
    security.consumeGeminiQuota.mockRejectedValue(new HttpError(429, 'AI request limit reached'));
    expect((await call()).statusCode).toBe(429);
    expect(upstream).not.toHaveBeenCalled();
  });
  it('rejects external file references', async () => {
    const result = await call({ body: JSON.stringify({ contents: [{ parts: [{ fileData: { fileUri: 'https://example.com' } }] }] }) });
    expect(result.statusCode).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });
  it('uses only the server key and clamps generation cost', async () => {
    upstream.mockResolvedValue({ ok: true, text: async () => '{"candidates":[]}' });
    const result = await call({ body: JSON.stringify({ contents: [{ parts: [{ text: 'test' }] }], tools: [{ googleSearch: {} }], generationConfig: { maxOutputTokens: 999999 } }) });
    expect(result.statusCode).toBe(200);
    expect(security.consumeGeminiQuota).toHaveBeenCalledWith('member');
    const [url, init] = upstream.mock.calls[0];
    expect(url).not.toContain('server-secret');
    expect(init.headers['x-goog-api-key']).toBe('server-secret');
    expect(JSON.parse(init.body)).toEqual({ contents: [{ role: 'user', parts: [{ text: 'test' }] }], generationConfig: { maxOutputTokens: 2048, candidateCount: 1 } });
    expect(result.body).not.toContain('server-secret');
  });
});
