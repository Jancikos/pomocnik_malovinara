import { nacitajSarzu } from '../../services/sarza.service'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, (db, context) => nacitajSarzu(db, context.pivnicaId, getRouterParam(event, 'id')!)))