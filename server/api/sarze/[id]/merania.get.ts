import { nacitajMerania } from '../../../services/meranie.service'
import { withAuth } from '../../../utils/handler'
export default defineEventHandler((event) => withAuth(event, (db, context) => nacitajMerania(db, context.pivnicaId, getRouterParam(event, 'id')!)))