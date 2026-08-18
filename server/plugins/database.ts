import { initializeDatabase } from '../database/init'

export default defineNitroPlugin(async () => {
  await initializeDatabase()
})