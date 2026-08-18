import { createVessel } from '../../services/vessel.service'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, async (db, context) => createVessel(db, context.cellarId, await readBody(event))))