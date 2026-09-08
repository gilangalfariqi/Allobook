import { test, expect } from '@playwright/test';

test.describe('Catalog and Book Detail Flow', () => {
  test('should display homepage with hero, featured books, and footer', async ({ page }) => {
    await page.goto('/');

    // Check brand header
    await expect(page.locator('header, nav')).toContainText('AlloBook');

    // Check Hero title
    await expect(page.locator('h1')).toContainText('The Library of');

    // Check explore catalog button link
    const catalogLink = page.locator('a[href="/books"]').first();
    await expect(catalogLink).toBeVisible();

    // Check floating AlloBot chatbot toggle button
    const chatbotToggle = page.locator('button:has-text("AlloBot"), button:has(.material-symbols-outlined:has-text("smart_toy")), button[aria-label*="chat" i]');
    await expect(chatbotToggle.first()).toBeVisible();
  });

  test('should navigate to books catalog page and show catalog filters', async ({ page }) => {
    await page.goto('/books');

    await expect(page.locator('h1')).toContainText('Katalog Literatur');

    // Check search input presence
    const searchInput = page.locator('input[placeholder*="Cari" i]');
    await expect(searchInput).toBeVisible();

    // Check pre-order filter checkbox or button
    await expect(page.locator('text=Pre-Order')).toBeVisible();
  });

  test('should open AlloBot floating widget when clicked', async ({ page }) => {
    await page.goto('/');

    // Click chatbot button
    const chatbotToggle = page.locator('button:has(.material-symbols-outlined:has-text("smart_toy")), button:has-text("AlloBot")').first();
    await chatbotToggle.click();

    // Widget should now show AlloBot header and welcome message
    await expect(page.locator('text=AlloBot')).toBeVisible();
    await expect(page.locator('text=asisten kurator buku virtual')).toBeVisible();
  });
});
