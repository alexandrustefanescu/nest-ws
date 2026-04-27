import { test, expect } from '@playwright/test';
import { createRoom, deleteRoom, userContext } from './helpers';

const PRESENCE_TIMEOUT = 12000;

test.describe('Presence tracking', () => {
  let room1Id: number;
  let room2Id: number;

  test.beforeEach(async () => {
    const r1 = await createRoom('e2e-presence-room-1');
    const r2 = await createRoom('e2e-presence-room-2');
    room1Id = r1.id;
    room2Id = r2.id;
  });

  test.afterEach(async () => {
    await deleteRoom(room1Id);
    await deleteRoom(room2Id);
  });

  test('user count updates on other clients when user switches rooms', async ({ browser }) => {
    const aliceCtx = await userContext(browser, 'alice');
    const bobCtx = await userContext(browser, 'bob');

    const alicePage = await aliceCtx.newPage();
    const bobPage = await bobCtx.newPage();

    try {
      await alicePage.goto(`/rooms/${room1Id}`);
      await expect(alicePage.getByText('1 online')).toBeVisible({ timeout: PRESENCE_TIMEOUT });

      await bobPage.goto(`/rooms/${room1Id}`);
      await expect(bobPage.getByText('2 online')).toBeVisible({ timeout: PRESENCE_TIMEOUT });
      await expect(alicePage.getByText('2 online')).toBeVisible({ timeout: PRESENCE_TIMEOUT });

      // Alice switches to room 2 — Bob should see 1 online in room 1
      await alicePage.goto(`/rooms/${room2Id}`);

      await expect(bobPage.getByText('1 online')).toBeVisible({ timeout: PRESENCE_TIMEOUT });
      await expect(alicePage.getByText('1 online')).toBeVisible({ timeout: PRESENCE_TIMEOUT });
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });

  test('user count increments when a second user joins', async ({ browser }) => {
    const aliceCtx = await userContext(browser, 'alice');
    const bobCtx = await userContext(browser, 'bob');

    const alicePage = await aliceCtx.newPage();
    const bobPage = await bobCtx.newPage();

    try {
      await alicePage.goto(`/rooms/${room1Id}`);
      await expect(alicePage.getByText('1 online')).toBeVisible({ timeout: PRESENCE_TIMEOUT });

      await bobPage.goto(`/rooms/${room1Id}`);
      await expect(bobPage.getByText('2 online')).toBeVisible({ timeout: PRESENCE_TIMEOUT });
      await expect(alicePage.getByText('2 online')).toBeVisible({ timeout: PRESENCE_TIMEOUT });
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });

  test('user count decrements when user closes tab', async ({ browser }) => {
    const aliceCtx = await userContext(browser, 'alice');
    const bobCtx = await userContext(browser, 'bob');

    const alicePage = await aliceCtx.newPage();
    const bobPage = await bobCtx.newPage();

    try {
      await alicePage.goto(`/rooms/${room1Id}`);
      await bobPage.goto(`/rooms/${room1Id}`);
      await expect(alicePage.getByText('2 online')).toBeVisible({ timeout: PRESENCE_TIMEOUT });
      await expect(bobPage.getByText('2 online')).toBeVisible({ timeout: PRESENCE_TIMEOUT });

      await aliceCtx.close();

      await expect(bobPage.getByText('1 online')).toBeVisible({ timeout: PRESENCE_TIMEOUT });
    } finally {
      await bobCtx.close();
    }
  });

  test('users in separate rooms are counted independently', async ({ browser }) => {
    const aliceCtx = await userContext(browser, 'alice');
    const bobCtx = await userContext(browser, 'bob');

    const alicePage = await aliceCtx.newPage();
    const bobPage = await bobCtx.newPage();

    try {
      await alicePage.goto(`/rooms/${room1Id}`);
      await bobPage.goto(`/rooms/${room2Id}`);

      await expect(alicePage.getByText('1 online')).toBeVisible({ timeout: PRESENCE_TIMEOUT });
      await expect(bobPage.getByText('1 online')).toBeVisible({ timeout: PRESENCE_TIMEOUT });
    } finally {
      await aliceCtx.close();
      await bobCtx.close();
    }
  });
});
