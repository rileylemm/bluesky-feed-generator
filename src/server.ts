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
    const firehose = new FirehoseSubscription(db, cfg.subscriptionEndpoint)

    const didCache = new MemoryCache()
    const didResolver = new DidResolver({
      plcUrl: 'https://plc.directory',
      didCache,
    })

    const server = createServer({
      validateResponse: false, // Disabled response validation
      payload: {
        jsonLimit: 100 * 1024, // 100kb
        textLimit: 100 * 1024, // 100kb
        blobLimit: 5 * 1024 * 1024, // 5mb
      },
    })

    const feedGen = new FeedGenerator(app, db, firehose, cfg)
    const ctx: AppContext = {
      db,
      cfg,
      didResolver,
      customFeeds: feedGen.customFeeds,
    }
    feedGeneration(server, ctx)
    describeGenerator(server, ctx)

    // Set Content-Type header
    app.use((req, res, next) => {
      res.type('application/json')
      next()
    })

    app.use(server.xrpc.router)
    app.use(wellKnown(ctx))

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
      
      // Log additional details about the error
      if (err.code) console.error('Error code:', err.code)
      if (err.type) console.error('Error type:', err.type)
      if (err.cause) console.error('Error cause:', err.cause)

      // Log the state of the database connection
      console.log('Database connection state:', this.db.getConnectionState())
      
      if (!res.headersSent) {
        // In development mode, send detailed error information
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
          // In production, still send a generic error message
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