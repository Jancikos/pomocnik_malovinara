import { presunSarzu } from '../../services/presun.service'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, async (db, context) => presunSarzu(db, context, await readBody(event))))