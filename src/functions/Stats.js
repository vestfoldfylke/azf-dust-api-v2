/*
const { app } = require('@azure/functions')
const { logger, logConfig } = require('@vtfk/logger')
const { decodeAccessToken } = require('../lib/helpers/decode-access-token')
const httpResponse = require('../lib/helpers/http-response')
const { getMongoClient } = require('../lib/mongo-client')
const { ObjectId } = require('mongodb')
const { MONGODB, DUST_ROLES, ALERT_RUNTIME_MS } = require('../../config')
const { maskSsnValues } = require('../lib/helpers/mask-values')

app.http('Stats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  /**
   *
   * @param { import('@azure/functions').HttpRequest } request
   * @param { import('@azure/functions').InvocationContext } context
   * @returns
   */

/*
  handler: async (request, context) => {
    logConfig({
      prefix: 'azf-dust-api-v2 - Stats'
    })
    /*
    logger('info', ['New Request. Validating token'], context)
    const decoded = decodeAccessToken(request.headers.get('authorization'))
    if (!decoded.verified) {
      logger('warn', ['Token is not valid', decoded.msg], context)
      return httpResponse(401, decoded.msg)
    }

    logConfig({
      prefix: `azf-dust-api-v2 - Stats - ${decoded.appid}${decoded.upn ? ' - ' + decoded.upn : ''}`
    })

    // VALIDATE ROLE AS WELL
    if (!decoded.roles.includes(DUST_ROLES.USER) && !decoded.roles.includes(DUST_ROLES.ADMIN)) {
      logger('info', ['Missing required role for request'], context)
      return httpResponse(401, 'Missing required role for the request')
    }
    */

/*
    logger('info', ['Token is valid, method is GET, checking params'], context)

    const mongoClient = await getMongoClient()
    const collection = mongoClient.db(MONGODB.DB_NAME).collection(MONGODB.REPORT_COLLECTION)
    const projection = {
      _id: 1,
      finishedTimestamp: 1,
      totalRuntime: 1,
      'user.userPrincipalName': 1,
      'caller.upn': 1,
      'caller.oid': 1
    }
    try {
      const reports = await collection.find({ totalRuntime: { $ne: null } }, { projection }).toArray()

      const stats = {
        meanRuntime: 0,
        mostSearched: [],
        leaderBoard: []
      }

      for (const report of reports) {
        // Runtime
        stats.meanRuntime += report.totalRuntime
        // Leaderboard
        if (!stats.leaderBoard.find(caller => caller.oid === report.caller.oid)) {
          stats.leaderBoard.push({ ...report.caller, reports: 0 })
        }
        const caller = stats.leaderBoard.find(caller => caller.oid === report.caller.oid)
        caller.reports++
        // MostSearched
        // Leaderboard
        if (!stats.mostSearched.find(user => user.userPrincipalName === report.user.userPrincipalName)) {
          stats.mostSearched.push({ ...report.user, searches: 0 })
        }
        const user = stats.mostSearched.find(user => user.userPrincipalName === report.user.userPrincipalName)
        user.searches++
      }

      // Mean runtime
      stats.meanRuntime = stats.meanRuntime / reports.length

      // Sort leaderboard
      stats.leaderBoard.sort((caller1, caller2) => caller2.reports - caller1.reports)

      // Sort mostSearched
      stats.mostSearched.sort((caller1, caller2) => caller2.searches - caller1.searches)

      // shorten mostSearched and leaderBoard
      stats.leaderBoard = stats.leaderBoard.slice(0, 10)
      stats.mostSearched = stats.mostSearched.slice(0, 10)

      return httpResponse(200, stats)
    } catch (error) {
      logger('error', ['Error when trying to get report', error.response?.data || error.stack || error.toString()], context)
      return httpResponse(500, error)
    }
  }
})

*/
