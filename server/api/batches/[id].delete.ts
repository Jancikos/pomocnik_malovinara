import { forceDeleteBatch } from '../../services/batch.service'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, async (db, context) => forceDeleteBatch(db, context.cellarId, getRouterParam(event, 'id')!, (await readBody<Record<string, unknown>>(event)).confirmation)))