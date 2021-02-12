import { Batch } from "../src/model";
import { DynamoDbRepository } from "../src/repository";
import { InMemoryDocumentClient } from "../src/documentClient";

describe("DynamoDbRepository", () => {
  let docClient: InMemoryDocumentClient;
  beforeAll(() => {
    docClient = new InMemoryDocumentClient();
  });

  it("can save a batch", async () => {
    const batch = new Batch(
      "batch01",
      "RUSTY-SOAPDISH",
      100,
      new Date(Date.UTC(2021, 3, 20))
    );
    const repo = new DynamoDbRepository(docClient);
    await repo.add(batch);

    const { Items } = await docClient
      .scan({
        TableName: "Batches",
      })
      .promise();
    expect(Items).toStrictEqual([
      {
        Eta: "2021-04-20",
        PurchasedQuantity: 100,
        Reference: "batch01",
        Sku: "RUSTY-SOAPDISH",
      },
    ]);
  });

  it("can retrieve a batch with allocations", () => {});
});
