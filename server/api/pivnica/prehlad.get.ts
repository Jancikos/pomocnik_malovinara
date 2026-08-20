import { nacitajPrehladPivnice } from '../../services/prehlad-pivnice.service'
import { withAuth } from '../../utils/handler'

export default defineEventHandler((event) => withAuth(event, (db, context) =>
  nacitajPrehladPivnice(db, { id: context.pivnicaId, name: context.nazovPivnice }),
))