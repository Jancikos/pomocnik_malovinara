export class DomainError extends Error {
  constructor(message: string, public readonly statusCode = 400) {
    super(message)
  }
}

export function notFound(message: string): never {
  throw new DomainError(message, 404)
}

export function forbidden(message = 'K týmto dátam nemáte prístup.'): never {
  throw new DomainError(message, 403)
}

export function toHttpError(error: unknown): never {
  if (error instanceof DomainError) {
    throw createError({ statusCode: error.statusCode, message: error.message })
  }
  throw error
}