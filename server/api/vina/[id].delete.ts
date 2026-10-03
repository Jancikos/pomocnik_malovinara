import { vynutVymazanieVina } from '../../services/vino.service'

export default defineEventHandler((event) => withAuth(event, async (db, context) => vynutVymazanieVina(db, context.pivnicaId, getRouterParam(event, 'id')!, (await readBody<Record<string, unknown>>(event)).confirmation)))
