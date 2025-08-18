# azf-dust-api-v2
Simpelt duste-api

## Functions / Endpoints
### GET /Report/{reportId}
Gets a report from mongodb. If report have finishedTimestamp: null, returns status 202. If report have value in finishedTimestamp returns 200.

### POST /Report
Creates a new report in mongodb, and returns reportId (ObjectId)

## GET /UserSearch?query={searchstring}
Returns list of users that matches the query (case-insensitive):
```js
{
  $or: [
    { displayName: regex },
    { samAccountName: regex },
    { userPrincipalName: regex }
  ]
}
```

## Develop
- Install [azure-function-core-tools](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=windows%2Cisolated-process%2Cnode-v4%2Cpython-v2%2Chttp-trigger%2Ccontainer-apps&pivots=programming-language-javascript)
- Clone this repo
```bash
git clone <this repo>
```
- Install project
```bash
npm i
```
- Create local.settings.json
```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsFeatureFlags": "EnableWorkerIndexing",
    "AzureWebJobsStorage": "",
    "MONGODB_CONNECTION_STRING": "mongodb+srv://{db-user}:{db-user-password}@{cluster-url}/?retryWrites=true&w=majority",
    "MONGODB_USERS_COLLECTION": "{name of users collection}",
    "MONGODB_REPORT_COLLECTION": "{name of reports collection}",
    "MONGODB_EXTRA_CAUTION_COLLECTION": "{name of collection with objects on format {oid: objectIdfromEntra}}", // Enter entra id object id of users you want to flag with some extra information in the collection
    "MONGODB_DB_NAME": "{name of db}",
    "DUST_USER_ROLE": "{name of role for regular access}",
    "DUST_ADMIN_ROLE": "{name of role for admin access}",
    "TEAMS_WEBHOOK_URL": "workflow url if you want warnings and errors to teams",
    "EXTRA_CAUTION_TEAMS_WEBHOOK_URL": "workflow url if you want alert to teams when report is created on a extra caution user"
  },
  "Host": {
    "CORS": "*" // For cors in local development
  }
}
```
- Start up the local environment
```bash
func start
```

## Create azure resources
(Through portal / AZ CLI / Terraform / Bicep)
- Azure function
  - With entra Id authentication enabled through app registration
    - Add the roles DUST_USER_ROLE and DUST_ADMIN_ROLE to the app registration
    - Make sure the api user_impersonation is exposed from the app registration

## Deploy
Through AZ CLI or Github actions / Azure pipelines or similar