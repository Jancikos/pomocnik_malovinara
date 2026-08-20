import { vynutVymazanieSarze } from '../../services/sarza.service'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, async (db, context) => vynutVymazanieSarze(db, context.pivnicaId, getRouterParam(event, 'id')!, (await readBody<Record<string, unknown>>(event)).confirmation)))