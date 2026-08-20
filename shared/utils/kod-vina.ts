export function navrhniKodVina(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .match(/[A-Za-z]+/g) ?? []

  if (words.length === 0) return ''

  const code = words.length === 1
    ? words[0]!.slice(0, 2)
    : words.map(word => word[0]).join('')

  return code.toUpperCase().slice(0, 8)
}