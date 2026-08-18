import { getWine } from '../../services/wine.service'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, (db, context) => getWine(db, context.cellarId, getRouterParam(event, 'id')!)))