/** Spoločná logika prepočtu cukru pre formuláre aj ďalšie časti aplikácie. */
export class PrepocetCukru {
  // VZOREC: kg = objem v litroch / 100 × rozdiel cukornatosti v °NM × tento koeficient.
  static potrebneKilogramy(objemLitrov: number, pociatocnaCukornatost: number, pozadovanaCukornatost: number, koeficient: number): number {
    if (![objemLitrov, pociatocnaCukornatost, pozadovanaCukornatost].every((value) => Number.isFinite(value) && value >= 0)) {
      throw new Error('Objem a cukornatosť musia byť nezáporné konečné čísla.')
    }
    if (!Number.isFinite(koeficient) || koeficient <= 0) {
      throw new Error('Koeficient dosládzania musí byť kladné konečné číslo.')
    }
    const rozdiel = Math.max(0, pozadovanaCukornatost - pociatocnaCukornatost)
    return objemLitrov / 100 * rozdiel * koeficient
  }
}
