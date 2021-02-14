import { APIGatewayProxyEvent, Handler } from "aws-lambda";
import { DynamoDbDocumentClient } from "./documentClient";
import * as model from "./model";
import { DynamoDbRepository } from "./repository";

const documentClient = new DynamoDbDocumentClient();
const repository = new DynamoDbRepository(documentClient);

const isValidSku = (sku: string, batches: model.Batch[]) =>
  batches.map((b) => b.sku).includes(sku);

export const allocate: Handler = async (event: APIGatewayProxyEvent) => {
  const requestData = JSON.parse(event.body || "");
  const batches = await repository.list();
  const line = new model.OrderLine(
    requestData["orderId"],
    requestData["sku"],
    requestData["quantity"]
  );
  if (!isValidSku(line.sku, batches)) {
    return await {
      statusCode: 400,
      body: JSON.stringify({
        message: `Invalid sku ${line.sku}`,
      }),
    };
  }

  let batchref: string;
  try {
    batchref = model.allocate(line, batches);
  } catch (e) {
    if (e instanceof model.OutOfStockError) {
      return await {
        statusCode: 400,
        body: JSON.stringify({
          message: e.message,
        }),
      };
    } else throw e;
  }

  const batch = batches.find((b) => b.reference === batchref) as model.Batch;
  await repository.add(batch);

  const response = {
    statusCode: 201,
    body: JSON.stringify({
      batchref,
    }),
  };

  return await response;
};
