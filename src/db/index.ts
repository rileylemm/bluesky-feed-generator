import SqliteDb from 'better-sqlite3'
import { Kysely, Migrator, SqliteDialect } from 'kysely'
import { DatabaseSchema } from './schema'
import { migrationProvider } from './migrations'

export class Database extends Kysely<DatabaseSchema> {
  private sqliteDb: SqliteDb.Database

  constructor(location: string) {
    const sqliteDb = new SqliteDb(location)
    super({
      dialect: new SqliteDialect({
        database: sqliteDb,
      }),
    })
    this.sqliteDb = sqliteDb
  }

  getConnectionState(): string {
    try {
      // Perform a simple query to check if the database is responsive
      this.sqliteDb.prepare('SELECT 1').get()
      return 'Connected'
    } catch (error) {
      return `Disconnected: ${error.message}`
    }
  }
}

export const createDb = (location: string): Database => {
  return new Database(location)
}

export const migrateToLatest = async (db: Database) => {
  const migrator = new Migrator({ db, provider: migrationProvider })
  const { error } = await migrator.migrateToLatest()
  if (error) throw error
}

// We don't need to export Database as a type anymore, as it's already exported as a class