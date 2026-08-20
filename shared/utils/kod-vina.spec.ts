import { describe, expect, it } from 'vitest'
import { navrhniKodVina } from './kod-vina'

describe('navrhniKodVina', () => {
  it('použije prvé písmená slov viacslovného názvu', () => {
    expect(navrhniKodVina('Rizling vlašský')).toBe('RV')
    expect(navrhniKodVina('Cabernet Sauvignon rosé')).toBe('CSR')
  })

  it('použije prvé dve písmená jednoslovného názvu', () => {
    expect(navrhniKodVina('Rulandské')).toBe('RU')
  })

  it('odstráni diakritiku a obmedzí kód na osem znakov', () => {
    expect(navrhniKodVina('Červené cuvée')).toBe('CC')
    expect(navrhniKodVina('a b c d e f g h i')).toBe('ABCDEFGH')
  })
})