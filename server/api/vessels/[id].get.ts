import { getVessel } from '../../services/vessel.service'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, (db, context) => getVessel(db, context.cellarId, getRouterParam(event, 'id')!)))