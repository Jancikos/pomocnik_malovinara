import { getVessels } from '../../services/vessel.service'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, (db, context) => getVessels(db, context.cellarId)))