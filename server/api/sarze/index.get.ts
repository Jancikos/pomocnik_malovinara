import { StavSarze } from '../../../shared/domain'
import { nacitajSarze } from '../../services/sarza.service'
import { DomainError } from '../../utils/errors'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, (db, context) => {
  const status = getQuery(event).status
  if (status && !Object.values(StavSarze).includes(status as StavSarze)) throw new DomainError('Stav šarže nie je platný.')
  return nacitajSarze(db, context.pivnicaId, status as StavSarze | undefined)
}))