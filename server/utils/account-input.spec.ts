import { describe, expect, it } from 'vitest'
import { requiredAccountText, requiredPassword, validEmail } from './account-input'

describe('account input validation', () => {

  it('requires a nickname but does not make it unique here', () => {
    expect(requiredAccountText('  Vinár  ', 'Prezývka')).toBe('Vinár')
    expect(() => requiredAccountText('   ', 'Prezývka')).toThrow('Vyplňte pole „Prezývka“.')
  })

  it('accepts every non-empty password without complexity rules', () => {
    expect(requiredPassword('a')).toBe('a')
    expect(requiredPassword(' ')).toBe(' ')
    expect(() => requiredPassword('')).toThrow('Heslo je povinné.')
  })

  it('normalizes and validates email addresses', () => {
    expect(validEmail('  VINAR@EXAMPLE.SK ')).toBe('vinar@example.sk')
    expect(() => validEmail('vinar')).toThrow('Zadajte platnú e-mailovú adresu.')
  })
})
