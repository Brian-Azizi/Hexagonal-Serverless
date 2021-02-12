import { DocumentClient as DynamoDbDocumentClient } from "aws-sdk/clients/dynamodb";
export { DocumentClient as DynamoDbDocumentClient } from "aws-sdk/clients/dynamodb";

export class InMemoryDocumentClient extends DynamoDbDocumentClient {
  constructor() {
    super({
      apiVersion: "2012-08-10",
      region: "eu-west-1",
      endpoint: "http://localhost:8000",
    });
  }
}
