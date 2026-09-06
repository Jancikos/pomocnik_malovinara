import { describe, expect, it } from 'vitest'
import { PrepocetCukru } from './prepocet-cukru'

describe('PrepocetCukru', () => {
  it.each([
    [100, 18, 19, 1.25],
    [200, 18, 22, 10],
    [75, 18.5, 20, 1.40625],
    [100, 20, 20, 0],
    [100, 21, 20, 0],
    [0, 18, 20, 0],
  ])('pre %s l z %s na %s °NM vypočíta %s kg', (volume, initial, target, expected) => {
    expect(PrepocetCukru.potrebneKilogramy(volume, initial, target)).toBeCloseTo(expected)
  })
  it.each([-1, NaN, Infinity])('odmietne neplatný vstup %s', (value) => {
    expect(() => PrepocetCukru.potrebneKilogramy(value, 18, 20)).toThrow()
    expect(() => PrepocetCukru.potrebneKilogramy(100, value, 20)).toThrow()
    expect(() => PrepocetCukru.potrebneKilogramy(100, 18, value)).toThrow()
  })
})
