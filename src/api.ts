import { Handler, APIGatewayProxyEvent, Callback, Context } from "aws-lambda";
import { InMemoryDocumentClient } from "./documentClient";
import { DynamoDbRepository } from "./repository";
import * as model from "./model";

const documentClient = new InMemoryDocumentClient();
const repository = new DynamoDbRepository(documentClient);

export const allocate: Handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  callback: Callback
) => {
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
