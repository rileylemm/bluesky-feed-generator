import { createDb, migrateToLatest } from './db'
import dotenv from 'dotenv'
import { Database } from './db'

dotenv.config()

const samplePosts = [
  {
    uri: 'at://user1.bsky.social/post/1',
    cid: 'bafyreiabc123',
    text: 'Just finished training my new AI model on climate data. Exciting results!',
    indexedAt: new Date().toISOString(),
  },
  {
    uri: 'at://user2.bsky.social/post/1',
    cid: 'bafyreibcd234',
    text: 'Machine learning is revolutionizing healthcare. Here\'s how:',
    indexedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
  },
  {
    uri: 'at://user3.bsky.social/post/1',
    cid: 'bafyreicde345',
    text: 'The ethics of AI: We need to have a serious conversation about bias in algorithms.',
    indexedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    uri: 'at://user4.bsky.social/post/1',
    cid: 'bafyreidef456',
    text: 'Just attended a fascinating workshop on natural language processing. The future of NLP is bright!',
    indexedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
  },
  {
    uri: 'at://user5.bsky.social/post/1',
    cid: 'bafyreiegh567',
    text: 'Implementing a new deep learning model for image recognition. Any tips?',
    indexedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
  },
]

async function populateDb(db: Database) {
  for (const post of samplePosts) {
    await db
      .insertInto('post')
      .values(post)
      .onConflict((oc) => oc.doNothing())
      .execute()
  }
  console.log('Sample data inserted successfully.')
}

async function main() {
  const dbLocation = process.env.FEEDGEN_SQLITE_LOCATION || ':memory:'
  console.log(`Using database at ${dbLocation}`)
  
  const db = createDb(dbLocation)
  await migrateToLatest(db)
  
  await populateDb(db)
  
  await db.destroy()
}

main().catch((err) => {
  console.error('Error populating database:', err)
  process.exit(1)
})