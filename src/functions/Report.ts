import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { logger } from "@vestfoldfylke/loglady";
import { type Collection, type InsertOneResult, type MongoClient, ObjectId, type WithId } from "mongodb";
import { ALERT_RUNTIME_MS, DUST_ROLES, EXTRA_CAUTION_TEAMS_WEBHOOK_URL, MONGODB } from "../../config.js";
import { decodeAccessToken } from "../lib/helpers/decode-access-token.js";
import httpResponse from "../lib/helpers/http-response.js";
import { maskSsnValues } from "../lib/helpers/mask-values.js";
import { getMongoClient } from "../lib/mongo-client.js";
import { extraCautionAlert } from "../lib/teams-webhook-alert.js";
import type { Decoded } from "../types/decoded.js";
import type { ExtraCautionEntry, Report, RuntimeAlert, TestUser } from "../types/system.js";

const warnOnExtraCautionUser = async (id: string, upn: string): Promise<void> => {
  if (!EXTRA_CAUTION_TEAMS_WEBHOOK_URL) {
    logger.info("EXTRA_CAUTION_TEAMS_WEBHOOK_URL is not set in config, so no alert will be sent");
    return;
  }

  logger.info("EXTRA_CAUTION_TEAMS_WEBHOOK_URL is set in config, will send alert");
  try {
    await extraCautionAlert(id, upn);
  } catch (error) {
    logger.errorException(error as Error, "Error when trying to send alert to teams-workflow with extraCautionAlert");
  }
};

const assertMongoConfig = (): void => {
  if (!MONGODB.DB_NAME || !MONGODB.REPORT_COLLECTION || !MONGODB.USERS_COLLECTION || !MONGODB.EXTRA_CAUTION_COLLECTION) {
    throw new Error("MONGODB configuration is incomplete");
  }
};

app.http("Report", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "Report/{reportId?}",
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    logger.logConfig({
      prefix: "azf-dust-api-v2 - Report"
    });

    logger.info("New Request. Validating token");
    const decoded: Decoded = decodeAccessToken(request.headers.get("authorization"));
    if (!decoded.verified) {
      logger.warn("Token is not valid. Message: {Message}", decoded.msg);
      return httpResponse(401, decoded.msg);
    }

    logger.logConfig({
      prefix: `azf-dust-api-v2 - Report - ${decoded.appid}${decoded.upn ? ` - ${decoded.upn}` : ""}`
    });

    if (!decoded.roles.includes(DUST_ROLES.USER ?? "") && !decoded.roles.includes(DUST_ROLES.ADMIN ?? "")) {
      logger.info("Missing required role for request");
      return httpResponse(401, "Missing required role for the request");
    }

    try {
      assertMongoConfig();
    } catch (error) {
      logger.errorException(error as Error, "MONGODB configuration is incomplete");
      return httpResponse(500, (error as Error).message);
    }

    const dbName: string = MONGODB.DB_NAME as string;
    const reportCollectionName: string = MONGODB.REPORT_COLLECTION as string;
    const usersCollectionName: string = MONGODB.USERS_COLLECTION as string;
    const extraCautionCollectionName: string = MONGODB.EXTRA_CAUTION_COLLECTION as string;

    const mongoClient: MongoClient = await getMongoClient();
    const extraCautionCollection: Collection<ExtraCautionEntry> = mongoClient.db(dbName).collection<ExtraCautionEntry>(extraCautionCollectionName);
    const reportCollection: Collection<Report> = mongoClient.db(dbName).collection<Report>(reportCollectionName);
    const userCollection: Collection<TestUser> = mongoClient.db(dbName).collection<TestUser>(usersCollectionName);

    if (request.method === "GET") {
      logger.info("Token is valid, method is GET, checking params");
      const reportId: string | undefined = request.params.reportId;
      if (!reportId) {
        logger.warn('No param "reportId" here...');
        return httpResponse(400, 'No param "reportId" here...');
      }

      try {
        const report: WithId<Report> | null = await reportCollection.findOne({ _id: new ObjectId(reportId) });
        if (!report) {
          logger.warn("Could not find any report with _id: ObjectId({reportId})", reportId);
          return httpResponse(404, `Could not find any report with _id: ObjectId(${reportId})`);
        }

        if (!report.finishedTimestamp && !report.runtimeAlert) {
          const runtime: number = Date.now() - new Date(report.createdTimestamp).getTime();
          if (runtime > ALERT_RUNTIME_MS) {
            logger.warn(
              "ReportId: {reportId} - CreatedTimestamp: {reportCreatedTimestamp} - Runtime: {runtime} - Stakkar caller som sitter og venter: {reportCallerUpn} - Brukeren som er treig: {reportUserUserPrincipalName}",
              report._id.toString(),
              report.createdTimestamp,
              runtime,
              report.caller.upn,
              report.user.userPrincipalName
            );

            const runtimeAlert: RuntimeAlert = { status: true, triggeredAtMs: runtime };
            await reportCollection.updateOne({ _id: new ObjectId(reportId) }, { $set: { runtimeAlert } });
            report.runtimeAlert = runtimeAlert;
          }
        }

        const status: number = report.finishedTimestamp ? 200 : 202;
        maskSsnValues(report);

        return httpResponse(status, report);
      } catch (error) {
        logger.errorException(error as Error, "Error when trying to get report");
        return httpResponse(500, error);
      }
    }

    logger.info("Token is valid, method is POST, checking body");
    const userId: string = (await request.text()).replaceAll('"', "");

    let user: WithId<TestUser> | null;
    try {
      const userObjectId: ObjectId = new ObjectId(userId);
      user = await userCollection.findOne({ _id: userObjectId });
      if (!user) {
        logger.warn("User with ObjectId({userId}) not found in users collection", userId);
        return httpResponse(500, `User with ObjectId(${userId}) not found in users collection`);
      }

      logger.info("User with ObjectId({userId}) found in users collection", userId);
      const extraCautionEntry: WithId<ExtraCautionEntry> | null = await extraCautionCollection.findOne({ oid: user.id, disabled: { $ne: true } });
      if (extraCautionEntry) {
        user.extraCaution = true;
        logger.info("User with ObjectId({userId}) is flagged in extraCaution collection - added user.extraCaution true to user object", userId);
        await warnOnExtraCautionUser(extraCautionEntry.oid, decoded.upn);
      }
    } catch (error) {
      logger.errorException(error as Error, "Error when trying to get user with ObjectId({userId}) in users collection", userId);
      return httpResponse(500, error);
    }

    try {
      const report: Report = {
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
      };

      const insertReportResult: InsertOneResult<Report> = await reportCollection.insertOne(report);
      if (!insertReportResult.acknowledged) {
        logger.error("Failed when inserting new report to db");
        return httpResponse(500, "Failed when inserting new report to db");
      }

      logger.info("New report with Id {Id} created successfully", insertReportResult.insertedId.toString());
      return httpResponse(200, insertReportResult.insertedId.toString());
    } catch (error) {
      logger.errorException(error as Error, "Error when trying to create new report");
      return httpResponse(500, error);
    }
  }
});
