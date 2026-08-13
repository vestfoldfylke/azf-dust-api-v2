type MongoConfig = {
  CONNECTION_STRING: string | undefined
  DB_NAME: string | undefined
  REPORT_COLLECTION: string | undefined
  USERS_COLLECTION: string | undefined
  EXTRA_CAUTION_COLLECTION: string | undefined
}

type DustRoles = {
  USER: string | undefined
  ADMIN: string | undefined
}

export const ALERT_RUNTIME_MS: number = Number(process.env.ALERT_RUNTIME_MS) || 30000

export const MONGODB: MongoConfig = {
  CONNECTION_STRING: process.env.MONGODB_CONNECTION_STRING,
  DB_NAME: process.env.MONGODB_DB_NAME,
  REPORT_COLLECTION: process.env.MONGODB_REPORT_COLLECTION,
  USERS_COLLECTION: process.env.MONGODB_USERS_COLLECTION,
  EXTRA_CAUTION_COLLECTION: process.env.MONGODB_EXTRA_CAUTION_COLLECTION
}

export const DUST_ROLES: DustRoles = {
  USER: process.env.DUST_USER_ROLE,
  ADMIN: process.env.DUST_ADMIN_ROLE
}

export const EXTRA_CAUTION_TEAMS_WEBHOOK_URL: string | undefined = process.env.EXTRA_CAUTION_TEAMS_WEBHOOK_URL
