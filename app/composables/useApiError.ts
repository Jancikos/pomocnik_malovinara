export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const candidate = error as { data?: { message?: string; statusMessage?: string }; message?: string }
    return candidate.data?.message || candidate.data?.statusMessage || candidate.message || fallback
  }
  return fallback
}