import { Browser, BrowserContext, request as pwRequest } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:3000';
const FRONTEND_ORIGIN = 'http://localhost:4200';

export async function createRoom(name: string): Promise<{ id: number; name: string }> {
  const ctx = await pwRequest.newContext({ baseURL: API_BASE });
  const res = await ctx.post('/api/rooms', { data: { name } });
  const data = await res.json();
  await ctx.dispose();
  return data;
}

export async function deleteRoom(id: number): Promise<void> {
  const ctx = await pwRequest.newContext({ baseURL: API_BASE });
  await ctx.delete(`/api/rooms/${id}`);
  await ctx.dispose();
}

export function userContext(browser: Browser, userId: string): Promise<BrowserContext> {
  return browser.newContext({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: FRONTEND_ORIGIN,
          localStorage: [{ name: 'userId', value: userId }],
        },
      ],
    },
  });
}
