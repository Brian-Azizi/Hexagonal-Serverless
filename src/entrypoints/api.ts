import { APIGatewayProxyEvent, Handler } from "aws-lambda";
import { DynamoDbDocumentClient } from "../adapters/documentClient";
import { OutOfStockError } from "../domain/model";
import { DynamoProductRepository } from "../adapters/repository";
import * as services from "../servicelayer/services";

export const allocate: Handler = async (event: APIGatewayProxyEvent) => {
  const documentClient = new DynamoDbDocumentClient();
  const repository = new DynamoProductRepository(documentClient);

  const requestData = JSON.parse(event.body || "");

  let batchref: string;
  try {
    batchref = await services.allocate(repository)(
      requestData["orderId"],
      requestData["sku"],
      requestData["quantity"]
    );
  } catch (e) {
    if (e instanceof OutOfStockError || e instanceof services.InvalidSkuError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: e.message,
        }),
      };
    } else throw e;
  }

  return {
    statusCode: 201,
    body: JSON.stringify({
      batchref,
    }),
  };
};

export const addBatch: Handler = async (event: APIGatewayProxyEvent) => {
  const documentClient = new DynamoDbDocumentClient();
  const repository = new DynamoProductRepository(documentClient);

  const { reference, sku, quantity, eta } = JSON.parse(event.body || "");

  await services.addBatch(repository)(
    reference,
    sku,
    quantity,
    eta && new Date(eta)
  );

  return {
    statusCode: 201,
    body: "OK",
  };
};
