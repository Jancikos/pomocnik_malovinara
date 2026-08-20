import { vytvorSarzu } from '../../services/sarza.service'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, async (db, context) => vytvorSarzu(db, context.pivnicaId, await readBody(event))))