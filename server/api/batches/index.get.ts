import { BatchStatus } from '../../../shared/domain'
import { getBatches } from '../../services/batch.service'
import { DomainError } from '../../utils/errors'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, (db, context) => {
  const status = getQuery(event).status
  if (status && !Object.values(BatchStatus).includes(status as BatchStatus)) throw new DomainError('Stav šarže nie je platný.')
  return getBatches(db, context.cellarId, status as BatchStatus | undefined)
}))