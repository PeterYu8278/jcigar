import { authenticatedFetch } from '../serverFetch';

// Existing recognition code keeps its response format; credentials stay on the server.
export async function geminiFetch(input: string, init: RequestInit = {}) {
  const url = new URL(input);
  if (url.origin !== 'https://generativelanguage.googleapis.com') throw new Error('Invalid AI endpoint');
  const match = /^\/(v1|v1beta)\/models(?:\/([a-zA-Z0-9.-]+):generateContent)?$/.exec(url.pathname);
  if (!match) throw new Error('Unsupported AI operation');
  const params = new URLSearchParams({ version: match[1] });
  if (match[2]) params.set('model', match[2]);
  return authenticatedFetch(`/.netlify/functions/gemini?${params}`, init);
}

export class GoogleGenerativeAI {
  constructor(_unused?: string) {}
  getGenerativeModel({ model }: { model: string }) {
    return {
      async generateContent(input: string | any[]) {
        const parts = typeof input === 'string' ? [{ text: input }] : input.map(p => typeof p === 'string' ? { text: p } : p);
        const result = await geminiFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }] }),
        });
        if (!result.ok) throw new Error(`AI service request failed (${result.status})`);
        const data = await result.json();
        return { response: { ...data, text: () => (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('') } };
      },
    };
  }
}
