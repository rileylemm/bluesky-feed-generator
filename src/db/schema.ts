export type DatabaseSchema = {
  post: Post
  sub_state: SubState
}

export type Post = {
  uri: string
  cid: string
  indexedAt: string
  text: string | null // Add the 'text' column, allowing it to be null

}

export type SubState = {
  service: string
  cursor: number
}
