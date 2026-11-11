import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const identity = vi.hoisted(() => ({ currentUser: null as null | { getIdToken: () => Promise<string> } }));
vi.mock('../../config/firebase', () => ({ auth: identity }));
import { GoogleGenerativeAI, geminiFetch } from './client';

describe('authenticated AI client', () => {
  const request = vi.fn();
  beforeEach(() => {
    request.mockReset();
    identity.currentUser = { getIdToken: async () => 'firebase-id-token' };
    vi.stubGlobal('fetch', request);
  });
  afterEach(() => vi.unstubAllGlobals());
  it('uses only the local gateway and authenticated token', async () => {
    request.mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'result' }] } }] }) });
    const result = await new GoogleGenerativeAI().getGenerativeModel({ model: 'gemini-2.5-flash' }).generateContent('test');
    expect(result.response.text()).toBe('result');
    const [url, init] = request.mock.calls[0];
    expect(url).toBe('/.netlify/functions/gemini?version=v1beta&model=gemini-2.5-flash');
    expect(init.headers.get('Authorization')).toBe('Bearer firebase-id-token');
    expect(JSON.parse(init.body)).toEqual({ contents: [{ parts: [{ text: 'test' }] }] });
  });
  it('requires login before making requests', async () => {
    identity.currentUser = null;
    await expect(geminiFetch('https://generativelanguage.googleapis.com/v1/models')).rejects.toThrow('请先登录');
    expect(request).not.toHaveBeenCalled();
  });
  it('rejects unrelated destinations', async () => {
    await expect(geminiFetch('https://example.com/v1/models')).rejects.toThrow('Invalid AI endpoint');
    expect(request).not.toHaveBeenCalled();
  });
});
