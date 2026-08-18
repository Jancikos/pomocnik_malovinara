import { transferBatch } from '../../services/transfer.service'
import { withAuth } from '../../utils/handler'
export default defineEventHandler((event) => withAuth(event, async (db, context) => transferBatch(db, context, await readBody(event))))