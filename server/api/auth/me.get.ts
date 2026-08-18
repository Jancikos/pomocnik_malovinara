import { withAuth } from '../../utils/handler'

export default defineEventHandler((event) => withAuth(event, (_db, context) => ({
  user: { id: context.userId, name: context.userName },
  cellar: { id: context.cellarId, name: context.cellarName },
})))