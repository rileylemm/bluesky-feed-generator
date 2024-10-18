import { Kysely } from 'kysely'

export interface DatabaseSchema {
  post: Post
  sub_state: SubState
}

export interface Post {
  uri: string
  cid: string
  indexedAt: string
  text: string | null
  replyParent: string | null
  replyRoot: string | null
}

export interface SubState {
  service: string
  cursor: number
}

export async function createTables(db: Kysely<DatabaseSchema>) {
  const tables = await db.introspection.getTables()
  const tableNames = tables.map(table => table.name)

  if (!tableNames.includes('post')) {
    await db.schema
      .createTable('post')
      .addColumn('uri', 'text', col => col.primaryKey())
      .addColumn('cid', 'text', col => col.notNull())
      .addColumn('indexedAt', 'text', col => col.notNull())
      .addColumn('text', 'text')
      .addColumn('replyParent', 'text')
      .addColumn('replyRoot', 'text')
      .execute()
  }

  if (!tableNames.includes('sub_state')) {
    await db.schema
      .createTable('sub_state')
      .addColumn('service', 'text', col => col.primaryKey())
      .addColumn('cursor', 'integer', col => col.notNull())
      .execute()
  }
}