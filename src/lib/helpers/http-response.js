// Simple http response handler, handles axios error as well as plain js errors
module.exports = (statuscode, data) => {
  if (!statuscode) throw new Error('Missing required parameter "statuscode"')
  if (!data) throw new Error('Missing required parameter "data"')
  if (statuscode >= 200 && statuscode < 300) return { status: statuscode, jsonBody: data }

  const error = data.response?.data || data.stack || data.toString()
  const message = data.toString()
  return { status: statuscode, jsonBody: { message, data: error } }
}
