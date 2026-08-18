import { createMeasurement } from '../../../services/measurement.service'
import { withAuth } from '../../../utils/handler'
export default defineEventHandler((event) => withAuth(event, async (db, context) => createMeasurement(db, context.cellarId, getRouterParam(event, 'id')!, await readBody(event))))