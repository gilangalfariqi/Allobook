import { test, expect } from '@playwright/test';

test.describe('Cart and Checkout Concierge Flow', () => {
  test('should display empty cart notification when navigating directly to cart', async ({ page }) => {
    await page.goto('/cart');

    await expect(page.locator('h1')).toContainText('Keranjang Belanja Masih Kosong');
    const startShoppingBtn = page.locator('a[href="/books"]:has-text("Mulai Jelajahi Buku")');
    await expect(startShoppingBtn).toBeVisible();
  });

  test('should display empty cart warning when navigating directly to checkout', async ({ page }) => {
    await page.goto('/checkout');

    await expect(page.locator('h1')).toContainText('Keranjang Anda Kosong');
  });

  test('should allow adding a book to cart and proceeding to checkout page', async ({ page }) => {
    // 1. Visit books catalog
    await page.goto('/books');

    // 2. Click the first available book
    const firstBookLink = page.locator('a[href^="/books/"]').first();
    if (await firstBookLink.isVisible()) {
      await firstBookLink.click();

      // 3. Ensure we are on the book detail page
      await expect(page).toHaveURL(/\/books\/.+/);

      // 4. Click Add to Cart / Pre-Order button if present
      const addToCartBtn = page.locator('button:has-text("Tambah ke Keranjang"), button:has-text("Pre-Order Sekarang")').first();
      if (await addToCartBtn.isVisible()) {
        await addToCartBtn.click();

        // 5. Navigate to /cart
        await page.goto('/cart');
        await expect(page.locator('h1')).toContainText('Keranjang Belanja');

        // 6. Check proceed to checkout CTA
        const checkoutBtn = page.locator('a[href="/checkout"]:has-text("Lanjut ke Checkout")');
        if (await checkoutBtn.isVisible()) {
          await checkoutBtn.click();
          await expect(page).toHaveURL('/checkout');
          await expect(page.locator('text=Informasi Pemesan')).toBeVisible();
        }
      }
    }
  });
});
