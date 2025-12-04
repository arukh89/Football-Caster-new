import { test, expect } from '@playwright/test';

test.describe('Navigation keyboard accessibility', () => {
  test('mobile menu toggles via keyboard', async ({ page, browserName }) => {
    await page.goto('/');

    // Only meaningful on mobile project where the toggle exists
    const toggle = page.getByRole('button', { name: /open menu|close menu/i });
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    await expect(page.locator('#mobile-nav-panel')).toBeVisible();
    await page.keyboard.press('Enter'); // toggle close
  });

  test('desktop nav marks current page', async ({ page }) => {
    await page.goto('/market');
    const nav = page.getByRole('navigation', { name: /Primary Desktop/i });
    await expect(nav).toBeVisible();
    const current = nav.getByRole('link', { name: /Market/i });
    await expect(current).toHaveAttribute('aria-current', 'page');
  });
});
