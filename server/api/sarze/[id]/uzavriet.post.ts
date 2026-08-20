import { uzavriSarzu } from '../../../services/sarza.service'
import { withAuth } from '../../../utils/handler'
export default defineEventHandler((event) => withAuth(event, (db, context) => uzavriSarzu(db, context.pivnicaId, getRouterParam(event, 'id')!)))