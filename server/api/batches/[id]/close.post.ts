import { closeBatch } from '../../../services/batch.service'
import { withAuth } from '../../../utils/handler'
export default defineEventHandler((event) => withAuth(event, (db, context) => closeBatch(db, context.cellarId, getRouterParam(event, 'id')!)))