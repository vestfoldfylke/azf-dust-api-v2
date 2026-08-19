/*
import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { logger } from '@vestfoldfylke/loglady'
import { ObjectId } from 'mongodb'
import { ALERT_RUNTIME_MS, DUST_ROLES, MONGODB } from '../../config.js'
import { decodeAccessToken } from '../lib/helpers/decode-access-token.js'
import httpResponse from '../lib/helpers/http-response.js'
import { maskSsnValues } from '../lib/helpers/mask-values.js'
import { getMongoClient } from '../lib/mongo-client.js'

app.http('Stats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    logger.logConfig({
      prefix: 'azf-dust-api-v2 - Stats'
    })
    logger.info('New Request. Validating token')
    const decoded = decodeAccessToken(request.headers.get('authorization'))
    if (!decoded.verified) {
      logger.warn('Token is not valid. Message: {Message}', decoded.msg)
      return httpResponse(401, decoded.msg)
    }

    logger.logConfig({
      prefix: `azf-dust-api-v2 - Stats - ${decoded.appid}${decoded.upn ? ' - ' + decoded.upn : ''}`
    })

    if (!decoded.roles.includes(DUST_ROLES.USER ?? '') && !decoded.roles.includes(DUST_ROLES.ADMIN ?? '')) {
      logger.info('Missing required role for request')
      return httpResponse(401, 'Missing required role for the request')
    }

    logger.info('Token is valid, method is GET, checking params')

    const mongoClient = await getMongoClient()
    const collection = mongoClient.db(MONGODB.DB_NAME as string).collection(MONGODB.REPORT_COLLECTION as string)
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
        mostSearched: [] as unknown[],
        leaderBoard: [] as unknown[]
      }

      for (const report of reports) {
        stats.meanRuntime += report.totalRuntime
        if (!stats.leaderBoard.find((caller: any) => caller.oid === report.caller.oid)) {
          stats.leaderBoard.push({ ...report.caller, reports: 0 })
        }
        const caller: any = stats.leaderBoard.find((c: any) => c.oid === report.caller.oid)
        caller.reports++
        if (!stats.mostSearched.find((user: any) => user.userPrincipalName === report.user.userPrincipalName)) {
          stats.mostSearched.push({ ...report.user, searches: 0 })
        }
        const user: any = stats.mostSearched.find((u: any) => u.userPrincipalName === report.user.userPrincipalName)
        user.searches++
      }

      stats.meanRuntime = stats.meanRuntime / reports.length

      stats.leaderBoard.sort((caller1: any, caller2: any) => caller2.reports - caller1.reports)
      stats.mostSearched.sort((caller1: any, caller2: any) => caller2.searches - caller1.searches)

      stats.leaderBoard = stats.leaderBoard.slice(0, 10)
      stats.mostSearched = stats.mostSearched.slice(0, 10)

      return httpResponse(200, stats)
    } catch (error) {
      logger.errorException(error as Error, 'Error when trying to get report')
      return httpResponse(500, error)
    }
  }
})
*/
export {};
