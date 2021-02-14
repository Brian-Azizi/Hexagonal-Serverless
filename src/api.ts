import { APIGatewayProxyEvent, Handler } from "aws-lambda";
import { DynamoDbDocumentClient } from "./documentClient";
import * as model from "./model";
import { DynamoDbRepository } from "./repository";
import * as services from "./services";

export const allocate: Handler = async (event: APIGatewayProxyEvent) => {
  const documentClient = new DynamoDbDocumentClient();
  const repository = new DynamoDbRepository(documentClient);

  const requestData = JSON.parse(event.body || "");
  const line = new model.OrderLine(
    requestData["orderId"],
    requestData["sku"],
    requestData["quantity"]
  );

  let batchref: string;
  try {
    batchref = await services.allocate(line, repository);
  } catch (e) {
    if (
      e instanceof model.OutOfStockError ||
      e instanceof services.InvalidSkuError
    ) {
      return await {
        statusCode: 400,
        body: JSON.stringify({
          message: e.message,
        }),
      };
    } else throw e;
  }

  const response = {
    statusCode: 201,
    body: JSON.stringify({
      batchref,
    }),
  };

  return await response;
};
