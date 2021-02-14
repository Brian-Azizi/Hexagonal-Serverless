import { DocumentClient } from "aws-sdk/clients/dynamodb";
import * as config from "../../config";

export class DynamoDbDocumentClient extends DocumentClient {
  constructor() {
    super(config.getDynamoConfig());
  }
}
