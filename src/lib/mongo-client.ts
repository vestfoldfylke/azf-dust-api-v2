import { logger } from "@vestfoldfylke/loglady";
import { MongoClient } from "mongodb";
import { MONGODB } from "../../config.js";

let client: MongoClient | null = null;

export const getMongoClient = async (): Promise<MongoClient> => {
  if (client) {
    return client;
  }

  if (!MONGODB.CONNECTION_STRING) {
    throw new Error("MONGODB_CONNECTION_STRING is not set");
  }

  logger.info("mongo-client - Client does not exist - creating");
  client = new MongoClient(MONGODB.CONNECTION_STRING);
  await client.connect();
  logger.info("mongo-client - Client connected");

  return client;
};

export const closeMongoClient = (): void => {
  if (client) {
    client.close();
  }
};
