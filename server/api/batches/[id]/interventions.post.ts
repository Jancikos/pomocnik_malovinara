import { createIntervention } from '../../../services/intervention.service'
import { withAuth } from '../../../utils/handler'
export default defineEventHandler((event) => withAuth(event, async (db, context) => createIntervention(db, context.cellarId, getRouterParam(event, 'id')!, await readBody(event))))