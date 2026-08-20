import { describe, expect, it } from 'vitest'
import { TypNadoby } from '../domain'
import { navrhniNazovNadoby } from './nazov-nadoby'

describe('navrhniNazovNadoby', () => {
  it('použije krátky názov typu nádoby a kapacitu', () => {
    expect(navrhniNazovNadoby(TypNadoby.DREVENY_SUD, 200)).toBe('Sud 200L')
    expect(navrhniNazovNadoby(TypNadoby.PLASTOVY_SUD, 150)).toBe('Sud 150L')
    expect(navrhniNazovNadoby(TypNadoby.NEREZOVY_TANK, 500)).toBe('Tank 500L')
    expect(navrhniNazovNadoby(TypNadoby.PLASTOVA_KADA, 300)).toBe('Kaďa 300L')
    expect(navrhniNazovNadoby(TypNadoby.DEMIZON, 50)).toBe('Demižón 50L')
  })
})