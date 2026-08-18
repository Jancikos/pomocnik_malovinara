import { getBatch } from '../../services/batch.service'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, (db, context) => getBatch(db, context.cellarId, getRouterParam(event, 'id')!)))