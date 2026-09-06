import { acceptInvitation } from '../../services/cellar-sharing.service'
import { selectCellar } from '../../utils/auth'
import { withAuth } from '../../utils/handler'
export default defineEventHandler(async event => withAuth(event, async (db, context) => {
  const body = await readBody<{ token: string }>(event)
  const id = acceptInvitation(db, String(body.token ?? ''), context.userId)
  selectCellar(event, db, context.userId, id)
  return { id }
}))
