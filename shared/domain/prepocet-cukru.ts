/** Spoločná logika prepočtu cukru pre formuláre aj ďalšie časti aplikácie. */
export class PrepocetCukru {
  // VZOREC: kg = objem v litroch / 100 × rozdiel cukornatosti v °NM × tento koeficient.
  // ZMENU VZORCA vykonajte tu: 1,25 kg zvýši cukornatosť 100 l hmoty o 1 °NM.
  static readonly KG_NA_100_LITROV_A_STUPEN = 1.25

  static potrebneKilogramy(objemLitrov: number, pociatocnaCukornatost: number, pozadovanaCukornatost: number): number {
    if (![objemLitrov, pociatocnaCukornatost, pozadovanaCukornatost].every((value) => Number.isFinite(value) && value >= 0)) {
      throw new Error('Objem a cukornatosť musia byť nezáporné konečné čísla.')
    }
    const rozdiel = Math.max(0, pozadovanaCukornatost - pociatocnaCukornatost)
    return objemLitrov / 100 * rozdiel * this.KG_NA_100_LITROV_A_STUPEN
  }
}
