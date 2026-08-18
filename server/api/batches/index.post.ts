import { createBatch } from '../../services/batch.service'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, async (db, context) => createBatch(db, context.cellarId, await readBody(event))))