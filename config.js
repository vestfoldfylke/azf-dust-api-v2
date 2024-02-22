module.exports = {
  ALERT_RUNTIME_MS: process.env.ALERT_RUNTIME_MS || 30000,
  MONGODB: {
    CONNECTION_STRING: process.env.MONGODB_CONNECTION_STRING,
    DB_NAME: process.env.MONGODB_DB_NAME,
    REPORT_COLLECTION: process.env.MONGODB_REPORT_COLLECTION,
    USERS_COLLECTION: process.env.MONGODB_USERS_COLLECTION
  },
  DUST_ROLES: {
    USER: process.env.DUST_USER_ROLE,
    ADMIN: process.env.DUST_ADMIN_ROLE
  }
}
