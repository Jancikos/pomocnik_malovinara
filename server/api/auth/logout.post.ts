import { destroySession } from '../../utils/auth'
import { withDatabase } from '../../utils/handler'

export default defineEventHandler((event) => withDatabase((db) => {
  destroySession(event, db)
  return { ok: true }
}))