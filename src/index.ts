import dotenv from 'dotenv'
import FeedGenerator from './server'
import * as aiFeed from './algos/ai-feed'
import { createDb, migrateToLatest, Database } from './db'
import { FirehoseSubscription } from './subscription'
import { AppContext } from './config'
import { DidResolver, MemoryCache } from '@atproto/identity'
import { createTables } from './db/schema'

const run = async () => {
  dotenv.config()
  const hostname = maybeStr(process.env.FEEDGEN_HOSTNAME) ?? 'example.com'
  const serviceDid =
    maybeStr(process.env.FEEDGEN_SERVICE_DID) ?? `did:web:${hostname}`

  console.log('Initializing database...')
  const dbLocation = process.env.FEEDGEN_SQLITE_LOCATION || ':memory:'
  console.log(`Database location: ${dbLocation}`)
  
  const db = createDb(dbLocation)

  // Create tables if they don't exist
  await createTables(db)

  // Run migrations
  await migrateToLatest(db)
  
  console.log('Database initialized and migrated.')

  const server = FeedGenerator.create({
    db,
    port: maybeInt(process.env.FEEDGEN_PORT) ?? 3000,
    listenhost: maybeStr(process.env.FEEDGEN_LISTENHOST) ?? 'localhost',
    subscriptionEndpoint: maybeStr(process.env.FEEDGEN_SUBSCRIPTION_ENDPOINT) ??
      'wss://bsky.network',
    publisherDid: maybeStr(process.env.FEEDGEN_PUBLISHER_DID) ?? serviceDid,
    subscriptionReconnectDelay: maybeInt(process.env.FEEDGEN_SUBSCRIPTION_RECONNECT_DELAY) ?? 3000,
    hostname,
    serviceDid,
    sqliteLocation: dbLocation
  })

  console.log('Registering feeds...')
  server.registerFeed(aiFeed)

  const didCache = new MemoryCache()
  const didResolver = new DidResolver({
    plcUrl: 'https://plc.directory',
    didCache,
  })

  const ctx: AppContext = {
    db: db,
    cfg: server.cfg,
    didResolver: didResolver,
    customFeeds: new Map()
  }
  const firehose = new FirehoseSubscription(db, ctx)
  firehose.run().catch((err) => {
    console.error('Firehose subscription error:', err)
  })

  await server.start()
  console.log(
    `🤖 running feed generator at http://${server.cfg.listenhost}:${server.cfg.port}`,
  )
}

const maybeStr = (val?: string) => {
  if (!val) return undefined
  return val
}

const maybeInt = (val?: string) => {
  if (!val) return undefined
  const int = parseInt(val, 10)
  if (isNaN(int)) return undefined
  return int
}

run().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})