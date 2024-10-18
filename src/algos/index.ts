import { AppContext } from '../config'
import {
  QueryParams,
  OutputSchema as AlgoOutput,
} from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import * as aiFeed from './ai-feed'

type AlgoHandler = (ctx: AppContext, params: QueryParams) => Promise<AlgoOutput>

const algos: Record<string, AlgoHandler> = {
  [aiFeed.shortname]: aiFeed.handler,
}

// Add a console log to verify registered feeds
console.log('Registered feeds:', Object.keys(algos));

export default algos