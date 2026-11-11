// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

const mocks = vi.hoisted(() => ({ verify: vi.fn(), runTransaction: vi.fn() }));
vi.mock('firebase-admin/app', () => ({ getApps: () => [{}], cert: vi.fn(), initializeApp: vi.fn() }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: mocks.verify }) }));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: () => ({
  runTransaction: mocks.runTransaction,
  collection: () => ({ doc: (id: string) => ({ id }) }),
}) }));
import { consumeGeminiQuota, requireUser } from './security';

describe('server authorization', () => {
  beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('ADMIN_UIDS', 'trusted-admin'); });
  it('rejects missing tokens without querying Firebase', async () => {
    await expect(requireUser({ headers: {} } as HandlerEvent)).rejects.toMatchObject({ status: 401 });
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it('checks revocation and denies admin roles not provisioned on the server', async () => {
    mocks.verify.mockResolvedValue({ uid: 'member', role: 'superAdmin' });
    await expect(requireUser({ headers: { authorization: 'Bearer token' } } as HandlerEvent, true)).rejects.toMatchObject({ status: 403 });
    expect(mocks.verify).toHaveBeenCalledWith('token', true);
  });
  it('denies revoked tokens', async () => {
    mocks.verify.mockRejectedValue(new Error('revoked'));
    await expect(requireUser({ headers: { authorization: 'Bearer token' } } as HandlerEvent)).rejects.toMatchObject({ status: 401 });
  });
  it('allows explicitly provisioned administrators', async () => {
    mocks.verify.mockResolvedValue({ uid: 'trusted-admin' });
    await expect(requireUser({ headers: { authorization: 'Bearer token' } } as HandlerEvent, true)).resolves.toMatchObject({ uid: 'trusted-admin' });
  });
  it('blocks exhausted shared quota without incrementing counters', async () => {
    const set = vi.fn();
    mocks.runTransaction.mockImplementation(async callback => callback({
      getAll: async () => [
        { data: () => ({ period: Math.floor(Date.now() / 60_000), count: 12 }) },
        { data: () => ({}) }, { data: () => ({}) },
      ], set,
    }));
    await expect(consumeGeminiQuota('member')).rejects.toMatchObject({ status: 429 });
    expect(set).not.toHaveBeenCalled();
  });
});
