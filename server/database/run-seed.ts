import { getDatabase } from './client'
import { seedDevelopmentData } from './seed'

await seedDevelopmentData(getDatabase().db)
console.log('Development data are ready.')