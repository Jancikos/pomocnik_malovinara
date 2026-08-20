import { nacitajVina } from '../../services/vino.service'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, (db, context) => nacitajVina(db, context.pivnicaId)))