const { app } = require('@azure/functions')
const { logger, logConfig } = require('@vtfk/logger')
const { decodeAccessToken } = require('../lib/helpers/decode-access-token')
const httpResponse = require('../lib/helpers/http-response')
const { getMongoClient } = require('../lib/mongo-client')
const { ObjectId } = require('mongodb')
const { MONGODB, DUST_ROLES } = require('../../config')

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
            const status = report.finishedTimestamp ? 200 : 202
            return httpResponse(status, report)
        } catch (error) {
            logger('error', ['Error when trying to get report', error.response?.data || error.stack || error.toString()], context)
            return httpResponse(500, error)
        }
    } else { // If POST report
        logger('info', ['Token is valid, method is POST, checking body'], context)
        const user = await request.json()
        // Validate user body TODO
        
        const mongoClient = await getMongoClient()
        const collection = mongoClient.db(MONGODB.DB_NAME).collection(MONGODB.REPORT_COLLECTION)
        try {
            const report = {
                instanceId: context.invocationId,
                startedTimestamp: null,
                running: false,
                queued: null,
                ready: true,
                finishedTimestamp: null,
                runtime: null,
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
