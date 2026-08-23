import { DomainError } from './errors'


export function normalizeEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

export function requiredAccountText(value: unknown, label: string): string {
  const text = String(value ?? '').trim()
  if (!text) throw new DomainError(`Vyplňte pole „${label}“.`)
  return text
}

export function requiredPassword(value: unknown): string {
  const password = String(value ?? '')
  if (!password) throw new DomainError('Heslo je povinné.')
  return password
}

export function validEmail(value: unknown): string {
  const email = normalizeEmail(value)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new DomainError('Zadajte platnú e-mailovú adresu.')
  }
  return email
}
