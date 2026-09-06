import { getInvitation } from '../../services/cellar-sharing.service'
import { withDatabase } from '../../utils/handler'
export default defineEventHandler(event => withDatabase(db => {
  setHeader(event, 'Cache-Control', 'no-store')
  return getInvitation(db, String(getQuery(event).token ?? ''))
}))
