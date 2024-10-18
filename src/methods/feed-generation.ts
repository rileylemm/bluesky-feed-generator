import { Server } from '../lexicon'
import { AppContext } from '../config'
import { InvalidRequestError } from '@atproto/xrpc-server'
import { QueryParams, OutputSchema } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'

export default function (server: Server, ctx: AppContext) {
  server.app.bsky.feed.getFeedSkeleton(async ({ params, req }) => {
    console.log('Received request for getFeedSkeleton')
    console.log('Request params:', params)

    try {
      if (!params.feed) {
        console.error('Feed parameter is missing')
        throw new InvalidRequestError('Feed parameter is required')
      }

      const feedParts = params.feed.split('/')
      const feedId = feedParts[feedParts.length - 1] // Extract the feed name from the full URI
      console.log(`Requested feed: ${feedId}`)
      
      const feedGen = ctx.customFeeds.get(feedId)
      if (!feedGen) {
        console.error(`Feed not found: ${feedId}`)
        throw new InvalidRequestError('Unsupported algorithm', 'UnknownFeed')
      }

      const queryParams: QueryParams = {
        feed: params.feed,
        limit: params.limit,
        cursor: params.cursor,
      }
      console.log('Executing feed generator with params:', queryParams)
      const result = await feedGen(ctx, queryParams)
      console.log('Feed generator result:', result)

      // Ensure the result matches the OutputSchema
      const output: OutputSchema = {
        cursor: result.cursor,
        feed: result.feed.map(item => ({
          post: item.post,
          reason: item.reason // Include reason if it exists
        }))
      }

      console.log('Prepared output:', JSON.stringify(output, null, 2))

      return {
        encoding: 'application/json',
        body: output,
      }
    } catch (error) {
      console.error('Error in getFeedSkeleton:', error)
      console.error('Error details:', error instanceof Error ? error.message : String(error))
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available')
      throw error // Re-throw the error to be handled by the global error handler
    }
  })
}