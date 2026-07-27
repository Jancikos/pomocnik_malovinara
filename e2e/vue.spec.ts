import { test, expect } from '@playwright/test'

test('prihlásenie otvorí pivnicu a detail šarže', async ({ page }) => {
  await page.goto('/prihlasenie')
  await page.getByLabel('E-mail').fill('oskar@example.sk')
  await page.getByLabel('Heslo').fill('vino2026')
  await page.getByRole('button', { name: 'Vstúpiť do pivnice' }).click()
  await expect(page.getByRole('heading', { name: 'Moja pivnica' })).toBeVisible()
  await expect(page.locator('.batch-card')).toHaveCount(8)
  await page.locator('.batch-card').first().click()
  await expect(page.getByRole('button', { name: 'Pridať meranie / zásah' })).toBeVisible()
})

test('história ponúka hlavné filtre', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('vinarsky-pomocnik-session', 'user-oskar'),
  )
  await page.goto('/historia')
  await expect(page.getByRole('heading', { name: 'História pivnice' })).toBeVisible()
  await expect(page.getByLabel('Hľadať v histórii')).toBeVisible()
  await expect(page.getByText('Typ nádoby')).toBeVisible()
  await expect(page.getByText('Fáza')).toBeVisible()
})

test('obrazovka Merania je zámerný placeholder', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('vinarsky-pomocnik-session', 'user-oskar'),
  )
  await page.goto('/merania')
  await expect(
    page.getByRole('heading', { name: 'Prehľad meraní bude doplnený v ďalšej verzii.' }),
  ).toBeVisible()
})
