import type { HttpResponseInit } from "@azure/functions";

const httpResponse = (statusCode: number, data: unknown): HttpResponseInit => {
  if (!statusCode) {
    throw new Error('Missing required parameter "statusCode"');
  }
  if (!data) {
    throw new Error('Missing required parameter "data"');
  }

  if (statusCode >= 200 && statusCode < 300) {
    if (typeof data !== "string") {
      return {
        status: statusCode,
        jsonBody: data
      };
    }

    return {
      status: statusCode,
      body: data as string
    };
  }

  const error: string = data instanceof Error ? data.stack || data.toString() : String(data);
  const message: string = data instanceof Error ? data.toString() : String(data);
  return {
    status: statusCode,
    jsonBody: {
      message,
      data: error
    }
  };
};

export default httpResponse;
