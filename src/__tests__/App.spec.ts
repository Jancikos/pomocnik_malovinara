import { describe, expect, it } from 'vitest'
import { CatalogOptionProvider, CatalogService, EnumOptionProvider } from '@/services/catalog'
import { WineColor, enumLabels } from '@/domain/enums'

describe('OptionProvider', () => {
  it('načíta, zoradí a filtruje katalógové položky', () => {
    const provider = new CatalogOptionProvider(new CatalogService(), 'container-types')
    const options = provider.options()
    expect(options).toHaveLength(6)
    expect(options[0]).toMatchObject({ value: 'wood_barrel', label: 'Drevený sud' })
  })

  it('vytvorí možnosti z typovo bezpečného enumu', () => {
    const provider = new EnumOptionProvider(Object.values(WineColor), enumLabels.wineColor)
    expect(provider.options()).toContainEqual({ value: 'red', label: 'Červené' })
  })
})
