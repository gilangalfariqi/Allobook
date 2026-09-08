import { test, expect } from '@playwright/test';

test.describe('Order Tracking and Account Flow', () => {
  test('should redirect unauthenticated users from /orders to /login', async ({ page }) => {
    await page.goto('/orders');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h1')).toContainText('Masuk ke Akun Anda');
  });

  test('should redirect unauthenticated users from /wishlist to /login', async ({ page }) => {
    await page.goto('/wishlist');
    await expect(page).toHaveURL('/login');
  });

  test('should render 404 for non-existent order tracking ID', async ({ page }) => {
    const response = await page.goto('/orders/non-existent-order-id-999');
    expect(response?.status()).toBe(404);
  });
});
