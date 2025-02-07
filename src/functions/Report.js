const { app } = require('@azure/functions')
const { logger, logConfig } = require('@vtfk/logger')
const { decodeAccessToken } = require('../lib/helpers/decode-access-token')
const httpResponse = require('../lib/helpers/http-response')
const { getMongoClient } = require('../lib/mongo-client')
const { ObjectId } = require('mongodb')
const { MONGODB, DUST_ROLES, ALERT_RUNTIME_MS, EXTRA_CAUTION_TEAMS_WEBHOOK_URL } = require('../../config')
const { maskSsnValues } = require('../lib/helpers/mask-values')
const { extraCautionAlert } = require('../lib/teams-webhook-alert')

app.http('Report', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'Report/{reportId?}',
  /**
   *
   * @param { import('@azure/functions').HttpRequest } request
   * @param { import('@azure/functions').InvocationContext } context
   * @returns
   */
  handler: async (request, context) => {
    logConfig({
      prefix: 'azf-dust-api-v2 - UserSearch'
    })
    logger('info', ['New Request. Validating token'], context)
    const decoded = decodeAccessToken(request.headers.get('authorization'))
    if (!decoded.verified) {
      logger('warn', ['Token is not valid', decoded.msg], context)
      return httpResponse(401, decoded.msg)
    }

    logConfig({
      prefix: `azf-dust-api-v2 - UserSearch - ${decoded.appid}${decoded.upn ? ' - ' + decoded.upn : ''}`
    })

    // VALIDATE ROLE AS WELL
    if (!decoded.roles.includes(DUST_ROLES.USER) && !decoded.roles.includes(DUST_ROLES.ADMIN)) {
      logger('info', ['Missing required role for request'], context)
      return httpResponse(401, 'Missing required role for the request')
    }

    // If GET report
    if (request.method === 'GET') {
      logger('info', ['Token is valid, method is GET, checking params'], context)
      const reportId = request.params.reportId
      if (!reportId) {
        logger('info', ['No param "reportId" here...'], context)
        return httpResponse(400, 'No param "reportId" here...')
      }
      const mongoClient = await getMongoClient()
      const collection = mongoClient.db(MONGODB.DB_NAME).collection(MONGODB.REPORT_COLLECTION)
      try {
        const report = await collection.findOne({ _id: new ObjectId(reportId) })
        if (!report) {
          logger('info', [`Could not find any document with _id: ObjectId(${reportId})`], context)
          return httpResponse(404, `Could not find any document with _id: ObjectId(${reportId})`)
        }
        if (!report.finishedTimestamp && !report.runtimeAlert) {
          // Check if it has run tooo long
          const currentTimestamp = new Date()
          const runtime = currentTimestamp - new Date(report.createdTimestamp)
          if (runtime > ALERT_RUNTIME_MS) {
            logger('warn', [`ReportId: ${report._id}`, `CreatedTimestamp: ${report.createdTimestamp}`, `Runtime: ${runtime}`, `Stakkar caller som sitter og venter: ${report.caller.upn}`, `Brukeren som er treig: ${report.user.userPrincipalName}`])
            await collection.updateOne({ _id: new ObjectId(reportId) }, { $set: { runtimeAlert: { status: true, triggeredAtMs: runtime } } })
            // Simply set fakeFinishedTimestamp (which is fake), no need for the user to ask again for this report
            report.runtimeAlert = { runtimeAlert: { status: true, triggeredAtMs: runtime } }
          }
        }
        const status = report.finishedTimestamp ? 200 : 202
        maskSsnValues(report) // Skrell away stuff we dont want
        return httpResponse(status, report)
      } catch (error) {
        logger('error', ['Error when trying to get report', error.response?.data || error.stack || error.toString()], context)
        return httpResponse(500, error)
      }
    } else { // If POST report
      logger('info', ['Token is valid, method is POST, checking body'], context)
      const userId = await request.text()

      // Get db client
      const mongoClient = await getMongoClient()

      // Validate user body and get user
      let user
      try {
        const userObjectId = new ObjectId(userId)
        const userCollection = mongoClient.db(MONGODB.DB_NAME).collection(MONGODB.USERS_COLLECTION)
        user = await userCollection.findOne({ _id: userObjectId })
        if (!user) throw new Error(`Could not find any user with ObjectId(${userId}) in users collection`)
        logger('info', [`User with ObjectId(${userId}) found in users collection`], context)
        // Så kan vi sjekke her om user er flagga i mongodb, og slenge på en ekstra property på user
        const extraCautionCollection = mongoClient.db(MONGODB.DB_NAME).collection(MONGODB.EXTRA_CAUTION_COLLECTION)
        const extraCautionEntry = await extraCautionCollection.findOne({ oid: user.id, disabled: { $ne: true } })
        if (extraCautionEntry) {
          user.extraCaution = true
          logger('info', [`User with ObjectId(${userId}) is flagged in extraCaution collection - added user.extraCaution true to user object`], context)
          if (EXTRA_CAUTION_TEAMS_WEBHOOK_URL) {
            logger('info', ['EXTRA_CAUTION_TEAMS_WEBHOOK_URL is set in config, will send alert'], context)
            // Så kan vi slenge ut en melding til teams-workflow om at det er søkt på en flagga bruker
            try {
              await extraCautionAlert(extraCautionEntry.oid, decoded.upn)
            } catch (error) {
              logger('error', ['Error when trying to send alert to teams-workflow with extraCautionAlert', error.response?.data || error.stack || error.toString()], context)
            }
          } else {
            logger('info', ['EXTRA_CAUTION_TEAMS_WEBHOOK_URL is not set in config, so no alert will be sent'], context)
          }
        }
      } catch (error) {
        logger('error', [`Error when trying to get user with ObjectId(${userId}) in users collection`, error.response?.data || error.stack || error.toString()], context)
        return httpResponse(500, error)
      }

      const collection = mongoClient.db(MONGODB.DB_NAME).collection(MONGODB.REPORT_COLLECTION)
      try {
        const report = {
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
        const insertReportResult = await collection.insertOne(report)
        if (!insertReportResult.acknowledged) throw new Error('Failed when inserting document in db')
        return httpResponse(200, insertReportResult.insertedId)
      } catch (error) {
        logger('error', ['Error when trying to create report', error.response?.data || error.stack || error.toString()], context)
        return httpResponse(500, error)
      }
    }
  }
})
