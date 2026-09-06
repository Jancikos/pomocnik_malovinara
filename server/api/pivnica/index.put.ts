import { eq } from 'drizzle-orm'
import { pivnice } from '../../database/schema'
import { requiredAccountText } from '../../utils/account-input'
import { validateCellarLogo } from '../../services/cellar-sharing.service'
import { withAuth } from '../../utils/handler'

export default defineEventHandler(async event => withAuth(event, async (db, context) => {
  const body = await readBody<Record<string, unknown>>(event)
  const name = requiredAccountText(body.name, 'Názov pivnice')
  const defaultContainerLocation = String(body.defaultContainerLocation ?? '').trim()
  const logo = validateCellarLogo(body.logo)
  db.update(pivnice).set({ name, defaultContainerLocation, logo, updatedAt: new Date() }).where(eq(pivnice.id, context.pivnicaId)).run()
  return { success: true }
}))
