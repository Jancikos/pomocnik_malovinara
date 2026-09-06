import { selectCellar } from '../../utils/auth'
import { withAuth } from '../../utils/handler'
export default defineEventHandler(async event => withAuth(event, async (db, context) => {
  const body = await readBody<{ id: string }>(event)
  selectCellar(event, db, context.userId, String(body.id))
  return { success: true }
}))
