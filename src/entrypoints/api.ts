import { APIGatewayProxyEvent, Handler } from "aws-lambda";
import { DynamoDbDocumentClient } from "../adapters/documentClient";
import { OutOfStockError } from "../domain/model";
import { DynamoDbRepository } from "../adapters/repository";
import * as services from "../servicelayer/services";

export const allocate: Handler = async (event: APIGatewayProxyEvent) => {
  const documentClient = new DynamoDbDocumentClient();
  const repository = new DynamoDbRepository(documentClient);

  const requestData = JSON.parse(event.body || "");

  let batchref: string;
  try {
    batchref = await services.allocate(
      requestData["orderId"],
      requestData["sku"],
      requestData["quantity"],
      repository
    );
  } catch (e) {
    if (e instanceof OutOfStockError || e instanceof services.InvalidSkuError) {
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

  return response;
};

export const addBatch: Handler = async (event: APIGatewayProxyEvent) => {
  const documentClient = new DynamoDbDocumentClient();
  const repository = new DynamoDbRepository(documentClient);

  const { reference, sku, quantity, eta } = JSON.parse(event.body || "");

  await services.addBatch(
    reference,
    sku,
    quantity,
    eta && new Date(eta),
    repository
  );
  const response = {
    statusCode: 201,
    body: "OK",
  };

  return response;
};
