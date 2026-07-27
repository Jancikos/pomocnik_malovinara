import { test, expect } from '@playwright/test'

async function useDemoSession(page: import('@playwright/test').Page) {
  await page.addInitScript(() => localStorage.setItem('vinarsky-pomocnik-session', 'user-oskar'))
}

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

test('tlačidlo Vytvoriť ponúkne víno alebo šaržu', async ({ page }) => {
  await useDemoSession(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Vytvoriť', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Čo chcete vytvoriť?' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Nové víno/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Nová šarža/ })).toBeVisible()
})

test('prehľad vín otvorí detail s aktívnymi aj historickými šaržami', async ({ page }) => {
  await useDemoSession(page)
  await page.goto('/vina')
  await expect(page.getByRole('heading', { name: 'Moje vína' })).toBeVisible()
  await expect(page.locator('.wine-card')).toHaveCount(4)
  await page.locator('.wine-card').first().click()
  await expect(page.getByRole('heading', { name: 'Všetky šarže' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'História' })).toBeVisible()
})

test('merania obsahujú prehľad, filtre a pridanie cez výber šarže', async ({ page }) => {
  await useDemoSession(page)
  await page.goto('/merania')
  await expect(page.getByRole('heading', { name: 'Merania' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Posledné hodnoty podľa typu' })).toBeVisible()
  await expect(page.getByLabel('Hľadať v meraniach')).toBeVisible()
  await page.getByRole('button', { name: 'Pridať meranie' }).click()
  await expect(page.getByRole('heading', { name: 'Vyberte šaržu' })).toBeVisible()
})

test('história ponúka hlavné filtre', async ({ page }) => {
  await useDemoSession(page)
  await page.goto('/historia')
  await expect(page.getByRole('heading', { name: 'História pivnice' })).toBeVisible()
  await expect(page.getByLabel('Hľadať v histórii')).toBeVisible()
  await expect(page.getByText('Typ nádoby')).toBeVisible()
  await expect(page.getByText('Fáza')).toBeVisible()
})