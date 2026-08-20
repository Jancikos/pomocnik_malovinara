import { vytvorVino } from '../../services/vino.service'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, async (db, context) => vytvorVino(db, context.pivnicaId, await readBody(event))))