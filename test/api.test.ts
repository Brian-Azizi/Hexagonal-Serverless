import axios from "axios";
import * as uuid from "uuid";
import * as config from "../config";
import { DynamoDbDocumentClient } from "../src/documentClient";
import { emptyTable } from "./utils";

const addStock = (docClient: DynamoDbDocumentClient) => async (
  batches: [string, string, number, string][]
) => {
  const docClientRequests = batches.map(([ref, sku, qty, eta]) =>
    docClient
      .put({
        TableName: "Allocations",
        Item: {
          PK: ref,
          SK: eta,
          Reference: ref,
          Sku: sku,
          PurchasedQuantity: qty,
          Eta: eta,
          Allocations: [],
        },
      })
      .promise()
  );

  return await Promise.all(docClientRequests);
};

describe("Allocations API", () => {
  let docClient: DynamoDbDocumentClient;
  beforeAll(() => {
    docClient = new DynamoDbDocumentClient();
  });
  beforeEach(async (done) => {
    await emptyTable(docClient);
    done();
  });

  it("returns allocations", async () => {
    const [sku, otherSku] = [uuid.v4(), uuid.v4()];
    const [earlyBatch, laterBatch, otherBatch] = [
      uuid.v4(),
      uuid.v4(),
      uuid.v4(),
    ];
    await addStock(docClient)([
      [laterBatch, sku, 100, "2011-01-02"],
      [earlyBatch, sku, 100, "2011-01-01"],
      [otherBatch, otherSku, 100, "NONE"],
    ]);

    const requestData = { orderId: uuid.v4(), sku, quantity: 3 };
    const url = config.getApiUrl();
    const response = await axios.post(
      `${url}/allocate`,
      JSON.stringify(requestData)
    );
    expect(response.status).toBe(201);
    expect(response.data["batchref"]).toBe(earlyBatch);
  });
});
