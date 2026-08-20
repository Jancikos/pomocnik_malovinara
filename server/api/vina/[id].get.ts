import { nacitajVino } from '../../services/vino.service'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, (db, context) => nacitajVino(db, context.pivnicaId, getRouterParam(event, 'id')!)))