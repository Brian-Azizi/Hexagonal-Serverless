import { APIGatewayProxyEvent, Handler } from "aws-lambda";
import { DynamoDbDocumentClient } from "./documentClient";
import * as model from "./model";
import { DynamoDbRepository } from "./repository";

const documentClient = new DynamoDbDocumentClient();
const repository = new DynamoDbRepository(documentClient);

export const allocate: Handler = async (event: APIGatewayProxyEvent) => {
  const requestData = JSON.parse(event.body || "");
  const batches = await repository.list();
  const line = new model.OrderLine(
    requestData["orderId"],
    requestData["sku"],
    requestData["quantity"]
  );
  const batchref = model.allocate(line, batches);

  const response = {
    statusCode: 201,
    body: JSON.stringify({
      batchref,
    }),
  };

  return await response;
};
