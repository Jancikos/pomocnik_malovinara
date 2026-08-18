import { getMeasurements } from '../../../services/measurement.service'
import { withAuth } from '../../../utils/handler'
export default defineEventHandler((event) => withAuth(event, (db, context) => getMeasurements(db, context.cellarId, getRouterParam(event, 'id')!)))