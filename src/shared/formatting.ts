export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('sk-SK', { maximumFractionDigits }).format(value)
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('sk-SK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Bratislava',
  }).format(new Date(value))
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('sk-SK', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Bratislava',
  }).format(new Date(value))
}

export function localDateTimeValue(value = new Date()): string {
  const offset = value.getTimezoneOffset()
  return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16)
}
