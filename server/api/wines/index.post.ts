import { createWine } from '../../services/wine.service'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, async (db, context) => createWine(db, context.cellarId, await readBody(event))))