import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions'
import { logger } from '@vestfoldfylke/loglady'
import { DUST_ROLES, MONGODB } from '../../config.js'
import { decodeAccessToken } from '../lib/helpers/decode-access-token.js'
import httpResponse from '../lib/helpers/http-response.js'
import { maskSsnValues } from '../lib/helpers/mask-values.js'
import { getMongoClient } from '../lib/mongo-client.js'

app.http('UserSearch', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> => {
    logger.logConfig({
      prefix: 'azf-dust-api-v2 - UserSearch'
    })
    logger.info('New Request. Validating token')
    const decoded = decodeAccessToken(request.headers.get('authorization'))
    if (!decoded.verified) {
      logger.warn('Token is not valid! Message: {Message}', decoded.msg)
      return httpResponse(401, decoded.msg)
    }
    logger.logConfig({
      prefix: `azf-dust-api-v2 - UserSearch - ${decoded.appid}${decoded.upn ? ` - ${decoded.upn}` : ''}`
    })

    if (!decoded.roles.includes(DUST_ROLES.USER ?? '') && !decoded.roles.includes(DUST_ROLES.ADMIN ?? '')) {
      logger.info('Missing required role for request')
      return httpResponse(401, 'Missing required role for the request')
    }

    logger.info('Token is valid, checking params')
    const query = request.query.get('query')
    if (!query) {
      logger.warn('No param "query" here...')
      return httpResponse(400, 'No param "query" here...')
    }

    if (!MONGODB.DB_NAME || !MONGODB.USERS_COLLECTION) {
      logger.error('MONGODB configuration is incomplete')
      return httpResponse(500, 'MONGODB configuration is incomplete')
    }

    const mongoClient = await getMongoClient()
    const collection = mongoClient.db(MONGODB.DB_NAME).collection(MONGODB.USERS_COLLECTION)

    const qs = query.toLowerCase()
    const regex = { $regex: `^${qs}` }
    const findQuery = {
      $or: [
        { displayNameLowerCase: regex },
        { surNameLowerCase: regex },
        { samAccountName: regex },
        { userPrincipalName: regex },
        { feidenavn: regex }
      ]
    }

    const users = await collection.find(findQuery).limit(10).sort({ displayName: 1, samAccountName: 1, feidenavn: 1 }).toArray()
    maskSsnValues(users)

    return httpResponse(200, users)
  }
})
