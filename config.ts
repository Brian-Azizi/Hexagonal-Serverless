export function getApiUrl() {
  return process.env.apiBaseUrl || "http://localhost:3000/dev";
}

export function getDynamoConfig() {
  return {
    apiVersion: "2012-08-10",
    region: "eu-west-1",
    endpoint: process.env.dynamoEndpoint || "http://localhost:8000",
  };
}
