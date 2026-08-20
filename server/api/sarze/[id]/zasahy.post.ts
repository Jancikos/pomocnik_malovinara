import { vytvorZasah } from '../../../services/zasah.service'
import { withAuth } from '../../../utils/handler'
export default defineEventHandler((event) => withAuth(event, async (db, context) => vytvorZasah(db, context.pivnicaId, getRouterParam(event, 'id')!, await readBody(event))))