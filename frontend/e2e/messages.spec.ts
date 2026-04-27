import { test, expect } from '@playwright/test';
import { createRoom, deleteRoom, userContext } from './helpers';

const SOCKET_TIMEOUT = 12000;

test.describe('Message persistence', () => {
  let room1Id: number;
  let room2Id: number;

  test.beforeEach(async () => {
    const r1 = await createRoom('e2e-msg-room-1');
    const r2 = await createRoom('e2e-msg-room-2');
    room1Id = r1.id;
    room2Id = r2.id;
  });

  test.afterEach(async () => {
    await deleteRoom(room1Id);
    await deleteRoom(room2Id);
  });

  test('messages are visible after hard reload in second room', async ({ browser }) => {
    const aliceCtx = await userContext(browser, 'alice');
    const alicePage = await aliceCtx.newPage();

    try {
      await alicePage.goto(`/rooms/${room1Id}`);
      await expect(alicePage.getByLabel('Message')).toBeVisible({ timeout: SOCKET_TIMEOUT });
      await alicePage.getByLabel('Message').fill('hello from room 1');
      await alicePage.keyboard.press('Enter');
      await expect(alicePage.getByText('hello from room 1')).toBeVisible();

      await alicePage.goto(`/rooms/${room2Id}`);
      await expect(alicePage.getByLabel('Message')).toBeVisible({ timeout: SOCKET_TIMEOUT });
      await alicePage.getByLabel('Message').fill('hello from room 2');
      await alicePage.keyboard.press('Enter');
      await expect(alicePage.getByText('hello from room 2')).toBeVisible();

      // Hard reload — exercises the SSR hydration path
      await alicePage.reload();

      await expect(alicePage.getByText('hello from room 2')).toBeVisible({ timeout: SOCKET_TIMEOUT });
    } finally {
      await aliceCtx.close();
    }
  });

  test('messages from room 1 are not visible in room 2', async ({ browser }) => {
    const aliceCtx = await userContext(browser, 'alice');
    const alicePage = await aliceCtx.newPage();

    try {
      await alicePage.goto(`/rooms/${room1Id}`);
      await expect(alicePage.getByLabel('Message')).toBeVisible({ timeout: SOCKET_TIMEOUT });
      await alicePage.getByLabel('Message').fill('room 1 only message');
      await alicePage.keyboard.press('Enter');
      await expect(alicePage.getByText('room 1 only message')).toBeVisible();

      await alicePage.goto(`/rooms/${room2Id}`);
      await expect(alicePage.getByLabel('Message')).toBeVisible({ timeout: SOCKET_TIMEOUT });
      await expect(alicePage.getByText('room 1 only message')).not.toBeVisible();
    } finally {
      await aliceCtx.close();
    }
  });

  test('both users see a new message in real-time', async ({ browser }) => {
    const aliceCtx = await userContext(browser, 'alice');
    const bobCtx = await userContext(browser, 'bob');

    const alicePage = await aliceCtx.newPage();
    const bobPage = await bobCtx.newPage();

    try {
      await alicePage.goto(`/rooms/${room1Id}`);
      await bobPage.goto(`/rooms/${room1Id}`);

      await expect(alicePage.getByText('2 online')).toBeVisible({ timeout: SOCKET_TIMEOUT });
      await expect(bobPage.getByText('2 online')).toBeVisible({ timeout: SOCKET_TIMEOUT });

      await alicePage.getByLabel('Message').fill('hi bob!');
      await alicePage.keyboard.press('Enter');

      await expect(alicePage.getByText('hi bob!')).toBeVisible();
      await expect(bobPage.getByText('hi bob!')).toBeVisible({ timeout: SOCKET_TIMEOUT });
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });

  test('messages persist after room switch and navigating back', async ({ browser }) => {
    const aliceCtx = await userContext(browser, 'alice');
    const alicePage = await aliceCtx.newPage();

    try {
      await alicePage.goto(`/rooms/${room1Id}`);
      await expect(alicePage.getByLabel('Message')).toBeVisible({ timeout: SOCKET_TIMEOUT });
      await alicePage.getByLabel('Message').fill('sticky message');
      await alicePage.keyboard.press('Enter');
      await expect(alicePage.getByText('sticky message')).toBeVisible();

      await alicePage.goto(`/rooms/${room2Id}`);
      await expect(alicePage.getByLabel('Message')).toBeVisible({ timeout: SOCKET_TIMEOUT });

      await alicePage.goto(`/rooms/${room1Id}`);
      await expect(alicePage.getByText('sticky message')).toBeVisible({ timeout: SOCKET_TIMEOUT });
    } finally {
      await aliceCtx.close();
    }
  });
});
