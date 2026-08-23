import { eq } from 'drizzle-orm'
import { pivnice, users } from '../../database/schema'
import { requiredAccountText } from '../../utils/account-input'
import { withAuth } from '../../utils/handler'

export default defineEventHandler(async (event) => withAuth(event, async (db, context) => {
  const body = await readBody<Record<string, unknown>>(event)
  const nickname = requiredAccountText(body.nickname, 'Prezývka')
  const cellarName = requiredAccountText(body.cellarName, 'Názov pivnice')
  const defaultContainerLocation = String(body.defaultContainerLocation ?? '').trim()
  const now = new Date()

  db.transaction((tx) => {
    tx.update(users).set({ name: nickname, defaultContainerLocation, updatedAt: now })
      .where(eq(users.id, context.userId))
      .run()
    tx.update(pivnice).set({ name: cellarName, updatedAt: now })
      .where(eq(pivnice.id, context.pivnicaId))
      .run()
  })

  return {
    user: { id: context.userId, nickname, email: context.userEmail },
    pivnica: { id: context.pivnicaId, name: cellarName },
    preferences: { defaultContainerLocation },
  }
}))
