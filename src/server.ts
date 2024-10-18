import http from 'http'
import events from 'events'
import express from 'express'
import { DidResolver, MemoryCache } from '@atproto/identity'
import { createServer } from './lexicon'
import feedGeneration from './methods/feed-generation'
import describeGenerator from './methods/describe-generator'
import { Database } from './db'
import { FirehoseSubscription } from './subscription'
import { AppContext, Config } from './config'
import wellKnown from './well-known'
import * as aiFeed from './algos/ai-feed'  // Import the ai-feed

export class FeedGenerator {
  public app: express.Application
  public server?: http.Server
  public db: Database
  public firehose: FirehoseSubscription
  public cfg: Config
  private customFeeds: Map<string, (ctx: AppContext, params: any) => Promise<any>>

  constructor(
    app: express.Application,
    db: Database,
    firehose: FirehoseSubscription,
    cfg: Config,
  ) {
    this.app = app
    this.db = db
    this.firehose = firehose
    this.cfg = cfg
    this.customFeeds = new Map()
    this.setupErrorHandling()
  }

  static create(cfg: Config) {
    const app = express()
    const db = cfg.db
    const didCache = new MemoryCache()
    const didResolver = new DidResolver({
      plcUrl: 'https://plc.directory',
      didCache,
    })

    const server = createServer({
      validateResponse: false,
      payload: {
        jsonLimit: 100 * 1024,
        textLimit: 100 * 1024,
        blobLimit: 5 * 1024 * 1024,
      },
    })

    // Create the FeedGenerator instance
    const feedGen = new FeedGenerator(app, db, new FirehoseSubscription(db, { db, cfg, didResolver, customFeeds: new Map() }), cfg)

    // Use FeedGenerator's customFeeds in the appContext
    const appContext: AppContext = {
      db,
      cfg,
      didResolver,
      customFeeds: feedGen.customFeeds,  // Use the FeedGenerator's customFeeds map
    }

    // Register feed-generation and description methods
    feedGeneration(server, appContext)
    describeGenerator(server, appContext)

    // Register the ai-feed
    feedGen.registerFeed({
      shortname: aiFeed.shortname,
      handler: aiFeed.handler,
    })

    app.use((req, res, next) => {
      res.type('application/json')
      next()
    })

    app.use(server.xrpc.router)
    app.use(wellKnown(appContext))

    return feedGen
  }

  registerFeed(feed: { shortname: string; handler: (ctx: AppContext, params: any) => Promise<any> }) {
    console.log(`Registering feed: ${feed.shortname}`)
    this.customFeeds.set(feed.shortname, feed.handler)
  }

  async start(): Promise<http.Server> {
    this.server = this.app.listen(this.cfg.port, this.cfg.listenhost)
    await events.once(this.server, 'listening')
    return this.server
  }

  private setupErrorHandling() {
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Global error handler caught an error:')
      console.error('Error name:', err.name)
      console.error('Error message:', err.message)
      console.error('Error stack:', err.stack)
      console.error('Request URL:', req.url)
      console.error('Request method:', req.method)
      console.error('Request headers:', req.headers)
      console.error('Request body:', req.body)
      
      if (err.code) console.error('Error code:', err.code)
      if (err.type) console.error('Error type:', err.type)
      if (err.cause) console.error('Error cause:', err.cause)

      console.log('Database connection state:', this.db.getConnectionState())
      
      if (!res.headersSent) {
        if (process.env.NODE_ENV === 'development') {
          res.status(500).json({
            error: 'InternalServerError',
            message: err.message,
            stack: err.stack,
            name: err.name,
            code: err.code,
            type: err.type,
            cause: err.cause
          })
        } else {
          res.status(500).json({
            error: 'InternalServerError',
            message: 'An unexpected error occurred'
          })
        }
      }
    })
  }
}

export default FeedGenerator