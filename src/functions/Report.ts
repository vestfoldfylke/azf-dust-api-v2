import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { logger } from '@vestfoldfylke/loglady'
import { type Collection, type Document, type MongoClient, ObjectId } from 'mongodb'
import { ALERT_RUNTIME_MS, DUST_ROLES, EXTRA_CAUTION_TEAMS_WEBHOOK_URL, MONGODB } from '../../config.js'
import { decodeAccessToken } from '../lib/helpers/decode-access-token.js'
import httpResponse from '../lib/helpers/http-response.js'
import { maskSsnValues } from '../lib/helpers/mask-values.js'
import { getMongoClient } from '../lib/mongo-client.js'
import { extraCautionAlert } from '../lib/teams-webhook-alert.js'
import type { Decoded } from '../types/decoded.js'

type RuntimeAlert = {
  status: boolean
  triggeredAtMs: number
}

const warnOnExtraCautionUser = async (id: string, upn: string): Promise<void> => {
  if (!EXTRA_CAUTION_TEAMS_WEBHOOK_URL) {
    logger.info('EXTRA_CAUTION_TEAMS_WEBHOOK_URL is not set in config, so no alert will be sent')
    return
  }

  logger.info('EXTRA_CAUTION_TEAMS_WEBHOOK_URL is set in config, will send alert')
  try {
    await extraCautionAlert(id, upn)
  } catch (error) {
    logger.errorException(error as Error, 'Error when trying to send alert to teams-workflow with extraCautionAlert')
  }
}

const assertMongoConfig = (): void => {
  if (!MONGODB.DB_NAME || !MONGODB.REPORT_COLLECTION || !MONGODB.USERS_COLLECTION || !MONGODB.EXTRA_CAUTION_COLLECTION) {
    throw new Error('MONGODB configuration is incomplete')
  }
}

app.http('Report', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'Report/{reportId?}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    logger.logConfig({
      prefix: 'azf-dust-api-v2 - Report'
    })

    logger.info('New Request. Validating token')
    const decoded: Decoded = decodeAccessToken(request.headers.get('authorization'))
    if (!decoded.verified) {
      logger.warn('Token is not valid. Message: {Message}', decoded.msg)
      return httpResponse(401, decoded.msg)
    }

    logger.logConfig({
      prefix: `azf-dust-api-v2 - Report - ${decoded.appid}${decoded.upn ? ` - ${decoded.upn}` : ''}`
    })

    if (!decoded.roles.includes(DUST_ROLES.USER ?? '') && !decoded.roles.includes(DUST_ROLES.ADMIN ?? '')) {
      logger.info('Missing required role for request')
      return httpResponse(401, 'Missing required role for the request')
    }

    try {
      assertMongoConfig()
    } catch (error) {
      logger.errorException(error as Error, 'MONGODB configuration is incomplete')
      return httpResponse(500, (error as Error).message)
    }

    const dbName: string = MONGODB.DB_NAME as string
    const reportCollectionName: string = MONGODB.REPORT_COLLECTION as string
    const usersCollectionName: string = MONGODB.USERS_COLLECTION as string
    const extraCautionCollectionName: string = MONGODB.EXTRA_CAUTION_COLLECTION as string

    if (request.method === 'GET') {
      logger.info('Token is valid, method is GET, checking params')
      const reportId: string | undefined = request.params.reportId
      if (!reportId) {
        logger.warn('No param "reportId" here...')
        return httpResponse(400, 'No param "reportId" here...')
      }

      const mongoClient: MongoClient = await getMongoClient()
      const collection: Collection<Document> = mongoClient.db(dbName).collection(reportCollectionName)

      try {
        const report: Document | null = await collection.findOne({ _id: new ObjectId(reportId) })
        if (!report) {
          logger.warn('Could not find any document with _id: ObjectId({reportId})', reportId)
          return httpResponse(404, `Could not find any document with _id: ObjectId(${reportId})`)
        }

        if (!report.finishedTimestamp && !report.runtimeAlert) {
          const runtime: number = Date.now() - new Date(report.createdTimestamp).getTime()
          if (runtime > ALERT_RUNTIME_MS) {
            logger.warn(
              'ReportId: {reportId} - CreatedTimestamp: {reportCreatedTimestamp} - Runtime: {runtime} - Stakkar caller som sitter og venter: {reportCallerUpn} - Brukeren som er treig: {reportUserUserPrincipalName}',
              report._id.toString(),
              report.createdTimestamp,
              runtime,
              report.caller.upn,
              report.user.userPrincipalName
            )

            const runtimeAlert: RuntimeAlert = { status: true, triggeredAtMs: runtime }
            await collection.updateOne({ _id: new ObjectId(reportId) }, { $set: { runtimeAlert } })
            report.runtimeAlert = runtimeAlert
          }
        }

        const status: number = report.finishedTimestamp ? 200 : 202
        maskSsnValues(report)

        return httpResponse(status, report)
      } catch (error) {
        logger.errorException(error as Error, 'Error when trying to get report')
        return httpResponse(500, error)
      }
    }

    logger.info('Token is valid, method is POST, checking body')
    const userId: string = await request.text()

    const mongoClient: MongoClient = await getMongoClient()

    let user: Document | null
    try {
      const userObjectId: ObjectId = new ObjectId(userId)
      const userCollection: Collection<Document> = mongoClient.db(dbName).collection(usersCollectionName)
      user = await userCollection.findOne({ _id: userObjectId })
      if (!user) {
        logger.warn('User with ObjectId({userId}) not found in users collection', userId)
        return httpResponse(500, `User with ObjectId(${userId}) not found in users collection`)
      }

      logger.info('User with ObjectId({userId}) found in users collection', userId)
      const extraCautionCollection: Collection<Document> = mongoClient.db(dbName).collection(extraCautionCollectionName)
      const extraCautionEntry: Document | null = await extraCautionCollection.findOne({ oid: user.id, disabled: { $ne: true } })
      if (extraCautionEntry) {
        user.extraCaution = true
        logger.info('User with ObjectId({userId}) is flagged in extraCaution collection - added user.extraCaution true to user object', userId)
        await warnOnExtraCautionUser(extraCautionEntry.oid as string, decoded.upn)
      }
    } catch (error) {
      logger.errorException(error as Error, 'Error when trying to get user with ObjectId({userId}) in users collection', userId)
      return httpResponse(500, error)
    }

    const collection: Collection<Document> = mongoClient.db(dbName).collection(reportCollectionName)
    try {
      const report: Document = {
        instanceId: context.invocationId,
        createdTimestamp: new Date().toISOString(),
        startedTimestamp: null,
        running: false,
        queued: null,
        ready: true,
        finishedTimestamp: null,
        serverRuntime: null,
        totalRuntime: null,
        user,
        caller: {
          upn: decoded.upn,
          oid: decoded.oid
        },
        systems: []
      }
      const insertReportResult: { acknowledged: boolean; insertedId: ObjectId } = await collection.insertOne(report)
      if (!insertReportResult.acknowledged) {
        logger.error('Failed when inserting document in db')
        return httpResponse(500, 'Failed when inserting document in db')
      }

      return httpResponse(200, insertReportResult.insertedId)
    } catch (error) {
      logger.errorException(error as Error, 'Error when trying to create report')
      return httpResponse(500, error)
    }
  }
})
