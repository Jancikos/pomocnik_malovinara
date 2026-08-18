import { updateVessel } from '../../services/vessel.service'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, async (db, context) => updateVessel(db, context.cellarId, getRouterParam(event, 'id')!, await readBody(event))))