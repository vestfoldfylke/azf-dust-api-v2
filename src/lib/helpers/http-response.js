// Simple http response handler, handles plain js errors as well
module.exports = (statusCode, data) => {
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

  const error = data.stack || data.toString()
  const message = data.toString()
  return {
    status: statusCode,
    jsonBody: {
      message,
      data: error
    }
  }
}
