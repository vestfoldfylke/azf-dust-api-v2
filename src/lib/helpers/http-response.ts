import type { HttpResponseInit } from '@azure/functions'

const httpResponse = (statusCode: number, data: unknown): HttpResponseInit => {
  if (!statusCode) {
    throw new Error('Missing required parameter "statusCode"')
  }
  if (!data) {
    throw new Error('Missing required parameter "data"')
  }

  if (statusCode >= 200 && statusCode < 300) {
    return {
      status: statusCode,
      jsonBody: data
    }
  }

  const error = data instanceof Error ? data.stack || data.toString() : String(data)
  const message = data instanceof Error ? data.toString() : String(data)
  return {
    status: statusCode,
    jsonBody: {
      message,
      data: error
    }
  }
}

export default httpResponse
