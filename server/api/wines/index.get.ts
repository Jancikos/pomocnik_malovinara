import { getWines } from '../../services/wine.service'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, (db, context) => getWines(db, context.cellarId)))