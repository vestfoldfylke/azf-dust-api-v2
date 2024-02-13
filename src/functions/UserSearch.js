const { app } = require('@azure/functions')
const { logger, logConfig } = require('@vtfk/logger')
const { decodeAccessToken } = require('../lib/helpers/decode-access-token')
const httpResponse = require('../lib/helpers/http-response')
const { getMongoClient } = require('../lib/mongo-client')
const { MONGODB, DUST_ROLES } = require('../../config')
const { maskSsnValues } = require('../lib/helpers/mask-values')

app.http('UserSearch', {
  methods: ['GET'],
  authLevel: 'anonymous',
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

    logger('info', ['Token is valid, checking params'], context)
    if (!request.query.get('query')) {
      logger('info', ['No param "query" here...'], context)
      return httpResponse(400, 'No param "query" here...')
    }
    const mongoClient = await getMongoClient()
    const collection = mongoClient.db(MONGODB.DB_NAME).collection(MONGODB.USERS_COLLECTION)

    // const regex = `/.*${request.query.get('query')}.*/i`
    const regex = { $regex: request.query.get('query'), $options: 'i' }
    const findQuery = {
      $or: [
        { displayName: regex },
        { samAccountName: regex },
        { userPrincipalName: regex }
        // { employeeNumber: regex } // Do we want to be able to find regex ssn??
      ]
    }
    /*
    const projection = {
      userPrincipalName: 1,
      samAccountName: 1,
      displayName: 1,
      domain: 1,
      title: 1,
      departmentShort: 1,
      company: 1
    }
    */
    const users = await collection.find(findQuery).limit(10).sort({ displayName: 1, samAccountName: 1, employeeNumber: 1 }).toArray() // add projection on just what we need
    // const users = await collection.find(findQuery).limit(10).project(projection).sort({ displayName: 1, samAccountName: 1, employeeNumber: 1 }).toArray() // add projection on just what we need
    // Skrell away sensitive values
    maskSsnValues(users)
    return httpResponse(200, users)
  }
})
