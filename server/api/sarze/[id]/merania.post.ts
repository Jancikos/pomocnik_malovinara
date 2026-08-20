import { vytvorMeranie } from '../../../services/meranie.service'
import { withAuth } from '../../../utils/handler'
export default defineEventHandler((event) => withAuth(event, async (db, context) => vytvorMeranie(db, context.pivnicaId, getRouterParam(event, 'id')!, await readBody(event))))