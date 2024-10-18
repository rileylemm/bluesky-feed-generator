import { QueryParams } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'
import { sql } from 'kysely'

function parseCursor(cursor: string): { timestamp: string; cid: string } | null {
  const [timestamp, cid] = cursor.split('::')
  if (!timestamp || !cid) {
    console.error('Invalid cursor format')
    return null
  }
  return { timestamp, cid }
}

export const shortname = 'ai-feed'

export const handler = async (ctx: AppContext, params: QueryParams) => {
  console.log('AI Feed handler called with params:', params)

  try {
    console.log('Building query...')
    let builder = ctx.db
      .selectFrom('post')
      .select(['uri', 'cid', 'indexedAt'])
      // More specific keywords for AI applications, software, programming, and tools
      .where(sql`lower(text) like '%ai%'`)
      .orWhere(sql`lower(text) like '%artificial intelligence%'`)
      .orWhere(sql`lower(text) like '%machine learning%'`)
      .orWhere(sql`lower(text) like '%deep learning%'`)
      .orWhere(sql`lower(text) like '%neural networks%'`)
      .orWhere(sql`lower(text) like '%ai programming%'`)
      .orWhere(sql`lower(text) like '%ai tools%'`)
      .orWhere(sql`lower(text) like '%ai software%'`)
      .orWhere(sql`lower(text) like '%ai applications%'`)
      .orWhere(sql`lower(text) like '%nlp%'`)
      .orWhere(sql`lower(text) like '%natural language processing%'`)
      .orWhere(sql`lower(text) like '%computer vision%'`)
      .orWhere(sql`lower(text) like '%reinforcement learning%'`)
      .orWhere(sql`lower(text) like '%ai frameworks%'`)
      .orWhere(sql`lower(text) like '%tensorflow%'`)
      .orWhere(sql`lower(text) like '%pytorch%'`)
      .orWhere(sql`lower(text) like '%data science%'`)
      .orWhere(sql`lower(text) like '%ai ethics%'`)
      .orderBy('indexedAt', 'desc')
      .orderBy('cid', 'desc')
      .limit(params.limit ?? 50)

    console.log('Query built:', builder.compile().sql)

    if (params.cursor) {
      console.log('Cursor provided:', params.cursor)
      const parsed = parseCursor(params.cursor)
      if (!parsed) {
        throw new Error('Invalid cursor')
      }
      const { timestamp, cid } = parsed
      builder = builder
        .where('indexedAt', '<', timestamp)
        .orWhere(sql`indexedAt = ${timestamp} AND cid < ${cid}`)
      
      console.log('Query with cursor:', builder.compile().sql)
    }

    console.log('Executing database query...')
    const res = await builder.execute()
    console.log('Raw query results:', res)
    console.log(`Query returned ${res.length} results`)

    const feed = res.map((row) => {
      return { post: row.uri }
    })

    let cursor: string | undefined
    const last = res.at(-1)
    if (last) {
      cursor = `${last.indexedAt}::${last.cid}`
    }

    console.log(`Returning feed with ${feed.length} posts and cursor: ${cursor}`)

    return {
      cursor,
      feed,
    }
  } catch (error) {
    console.error('Error in AI feed handler:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available')
    throw new Error('Internal server error in AI feed handler')
  }
}