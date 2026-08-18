import { getDashboard } from '../../services/dashboard.service'
import { withAuth } from '../../utils/handler'

export default defineEventHandler((event) => withAuth(event, (db, context) =>
  getDashboard(db, { id: context.cellarId, name: context.cellarName }),
))