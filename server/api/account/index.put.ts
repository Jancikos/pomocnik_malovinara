import { eq } from 'drizzle-orm'
import { users } from '../../database/schema'
import { requiredAccountText } from '../../utils/account-input'
import { withAuth } from '../../utils/handler'

export default defineEventHandler(async (event) => withAuth(event, async (db, context) => {
  const body = await readBody<Record<string, unknown>>(event)
  const nickname = requiredAccountText(body.nickname, 'Prezývka')
  db.update(users).set({ name: nickname, updatedAt: new Date() }).where(eq(users.id, context.userId)).run()
  return { success: true }
}))
