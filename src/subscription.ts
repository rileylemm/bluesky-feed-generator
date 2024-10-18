import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import { Database } from './db'
import { AppContext } from './config'

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  constructor(db: Database, private ctx: AppContext) {
    super(db, ctx.cfg.subscriptionEndpoint)
  }

  async handleEvent(evt: RepoEvent): Promise<void> {
    if (!isCommit(evt)) return
    const ops = await getOpsByType(evt)

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    const postsToCreate = ops.posts.creates
      .filter((create) => {
        // Filter for AI-related posts
        const aiKeywords = ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'neural network']
        return aiKeywords.some(keyword => create.record.text.toLowerCase().includes(keyword))
      })
      .map((create) => {
        // Map AI-related posts to a db row
        return {
          uri: create.uri,
          cid: create.cid,
          replyParent: create.record.reply?.parent.uri ?? null,
          replyRoot: create.record.reply?.root.uri ?? null,
          indexedAt: new Date().toISOString(),
          text: create.record.text,
        }
      })

    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }
    if (postsToCreate.length > 0) {
      await this.db
        .insertInto('post')
        .values(postsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }

    console.log(`Processed ${postsToCreate.length} new AI-related posts and ${postsToDelete.length} deletions`)
  }

  async run(): Promise<void> {
    console.log('Starting Firehose subscription...')
    await super.run(this.ctx.cfg.subscriptionReconnectDelay)
  }
}