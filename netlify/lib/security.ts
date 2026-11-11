import type { HandlerEvent, HandlerResponse } from '@netlify/functions';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function adminApp() {
  if (!getApps().length) {
    const credential = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!credential) throw new HttpError(503, 'Server authentication is not configured');
    initializeApp({ credential: cert(JSON.parse(credential)) });
  }
  return getApps()[0];
}

// Privileged access is provisioned outside client-writable user documents.
export async function requireUser(event: HandlerEvent, adminOnly = false) {
  const header = event.headers.authorization || event.headers.Authorization || '';
  const match = /^Bearer (\S+)$/.exec(header);
  if (!match) throw new HttpError(401, 'Authentication required');
  const app = adminApp();
  let user;
  try { user = await getAuth(app).verifyIdToken(match[1], true); }
  catch { throw new HttpError(401, 'Invalid or expired authentication'); }
  if (adminOnly) {
    const allowed = (process.env.ADMIN_UIDS || '').split(',').map(v => v.trim()).filter(Boolean);
    if (!allowed.includes(user.uid)) throw new HttpError(403, 'Administrator access required');
  }
  return user;
}

export function errorResponse(error: unknown): HandlerResponse {
  return {
    statusCode: error instanceof HttpError ? error.status : 503,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify({ error: error instanceof HttpError ? error.message : 'Service unavailable' }),
  };
}

// Shared across function instances; failures deny the request instead of bypassing limits.
export async function consumeGeminiQuota(uid: string) {
  const db = getFirestore(adminApp());
  const minute = Math.floor(Date.now() / 60_000);
  const day = Math.floor(Date.now() / 86_400_000);
  const limits = [
    { id: `gemini-user-${uid}`, period: minute, limit: 12 },
    { id: 'gemini-global-minute', period: minute, limit: 120 },
    { id: 'gemini-global-day', period: day, limit: 1000 },
  ];
  await db.runTransaction(async tx => {
    const refs = limits.map(v => db.collection('_serverRateLimits').doc(v.id));
    const docs = await tx.getAll(...refs);
    const counts = docs.map((doc, i) => doc.data()?.period === limits[i].period ? Number(doc.data()?.count || 0) : 0);
    if (counts.some((count, i) => count >= limits[i].limit)) throw new HttpError(429, 'AI request limit reached');
    refs.forEach((ref, i) => tx.set(ref, { period: limits[i].period, count: counts[i] + 1 }));
  });
}
