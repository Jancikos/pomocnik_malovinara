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
    expect(PrepocetCukru.potrebneKilogramy(volume, initial, target, 1.25)).toBeCloseTo(expected)
  })
  it.each([-1, NaN, Infinity])('odmietne neplatný vstup %s', (value) => {
    expect(() => PrepocetCukru.potrebneKilogramy(value, 18, 20, 1.06)).toThrow()
    expect(() => PrepocetCukru.potrebneKilogramy(100, value, 20, 1.06)).toThrow()
    expect(() => PrepocetCukru.potrebneKilogramy(100, 18, value, 1.06)).toThrow()
  })
  it.each([
    [100, 18, 20, 1.06, 2.12],
    [100, 0, 20, 1, 20],
    [100, 18, 20, 1.25, 2.5],
    [100, 0, 20, 1.25, 25],
    [75, 18.5, 20, 1.15, 1.29375],
  ])('použije zvolený koeficient pre %s l z %s na %s °NM pri %s: %s kg', (volume, initial, target, coefficient, expected) => {
    expect(PrepocetCukru.potrebneKilogramy(volume, initial, target, coefficient)).toBeCloseTo(expected)
  })
  it.each([0, -1, NaN, Infinity])('odmietne neplatný koeficient %s', (value) => {
    expect(() => PrepocetCukru.potrebneKilogramy(100, 18, 20, value)).toThrow('Koeficient')
  })
})
