export function parseDecimal(value: unknown, field = 'Hodnota'): number {
  const normalized = typeof value === 'string' ? value.trim().replace(',', '.') : value
  const parsed = typeof normalized === 'number' ? normalized : Number(normalized)
  if (!Number.isFinite(parsed)) throw new Error(`${field} musí byť platné číslo.`)
  return parsed
}

export function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${field} je povinné.`)
  return value.trim()
}