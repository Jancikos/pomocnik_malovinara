import { upravVino } from '../../services/vino.service'

export default defineEventHandler((event) => withAuth(event, async (db, context) => upravVino(db, context.pivnicaId, getRouterParam(event, 'id')!, await readBody(event))))