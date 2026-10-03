import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'
import { createDatabase } from './client'
import { pivnice } from './schema'

it('doplní predvolené koeficienty existujúcim aj novým pivniciam', () => {
  const context = createDatabase(':memory:')
  try {
    const folder = resolve('drizzle/migrations')
    for (const file of readdirSync(folder).filter(file => file.endsWith('.sql') && file < '0008').sort()) {
      context.sqlite.exec(readFileSync(resolve(folder, file), 'utf8'))
    }
    context.sqlite.exec("INSERT INTO pivnice (id, name, default_container_location) VALUES ('old', 'Existujúca', 'Sklad')")
    context.sqlite.exec(readFileSync(resolve(folder, '0008_cellar_sweetening_coefficients.sql'), 'utf8'))
    expect(context.db.select().from(pivnice).get()).toMatchObject({ id: 'old', name: 'Existujúca', defaultContainerLocation: 'Sklad', koeficientDosladzaniaMustu: 1.06, koeficientDosladzaniaVody: 1 })
    const created = context.db.insert(pivnice).values({ id: 'new', name: 'Nová' }).returning().get()
    expect(created).toMatchObject({ koeficientDosladzaniaMustu: 1.06, koeficientDosladzaniaVody: 1 })
  } finally { context.sqlite.close() }
})
