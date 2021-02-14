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

  it("persists allocations", async () => {
    const sku = uuid.v4();
    const [batch1, batch2] = [uuid.v4(), uuid.v4()];
    const [order1, order2] = [uuid.v4(), uuid.v4()];
    await addStock(docClient)([
      [batch1, sku, 10, "2011-01-01"],
      [batch2, sku, 10, "2011-01-02"],
    ]);
    const line1 = { orderId: order1, sku, quantity: 10 };
    const line2 = { orderId: order2, sku, quantity: 10 };

    // first order uses up all stock in batch1
    const r1 = await axios.post(`${config.getApiUrl()}/allocate`, line1);
    expect(r1.status).toBe(201);
    expect(r1.data["batchref"]).toBe(batch1);

    // second order should go to batch 2
    const r2 = await axios.post(`${config.getApiUrl()}/allocate`, line2);
    expect(r2.status).toBe(201);
    expect(r2.data["batchref"]).toBe(batch2);
  });

  it("returns a 400 message if the sku is out of stock", async () => {
    const [sku, smallBatch, largeOrder] = [uuid.v4(), uuid.v4(), uuid.v4()];
    await addStock(docClient)([[smallBatch, sku, 10, "2011-01-01"]]);
    const data = { orderId: largeOrder, sku, quantity: 20 };
    const r = await axios.post(`${config.getApiUrl()}/allocate`, data, {
      validateStatus: null,
    });
    expect(r.status).toBe(400);
    expect(r.data["message"]).toBe(`Out of stock for sku ${sku}`);
  });

  it("returns a 400 message if the sku is invalid", async () => {
    const [unknownSku, orderId] = [uuid.v4(), uuid.v4()];
    const data = { orderId, sku: unknownSku, quantity: 20 };
    const r = await axios.post(`${config.getApiUrl()}/allocate`, data, {
      validateStatus: null,
    });
    expect(r.status).toBe(400);
    expect(r.data["message"]).toBe(`Invalid sku ${unknownSku}`);
  });
});
