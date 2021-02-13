import { Batch, OrderLine } from "../src/model";
import { DynamoDbRepository } from "../src/repository";
import { InMemoryDocumentClient } from "../src/documentClient";

async function emptyTable(
  documentClient: InMemoryDocumentClient
): Promise<void> {
  const { Items } = await documentClient
    .scan({ TableName: "Allocations" })
    .promise();

  const deleteRequests = Items?.map((Item) =>
    documentClient
      .delete({
        TableName: "Allocations",
        Key: { PK: Item.PK, SK: Item.SK },
      })
      .promise()
  );
  if (deleteRequests) await Promise.all(deleteRequests);
}

describe("DynamoDbRepository", () => {
  let docClient: InMemoryDocumentClient;
  beforeAll(() => {
    docClient = new InMemoryDocumentClient();
  });
  beforeEach(async (done) => {
    await emptyTable(docClient);
    done();
  });

  it("can save a batch", async () => {
    const batch = new Batch(
      "batch01",
      "RUSTY-SOAPDISH",
      100,
      new Date(Date.UTC(2021, 3, 20)),
      new Set([new OrderLine("order999", "RUSTY-SOAPDISH", 15)])
    );
    const repo = new DynamoDbRepository(docClient);
    await repo.add(batch);

    const { Items } = await docClient
      .scan({
        TableName: "Allocations",
      })
      .promise();
    expect(Items).toStrictEqual([
      {
        Eta: "2021-04-20",
        PurchasedQuantity: 100,
        Reference: "batch01",
        Sku: "RUSTY-SOAPDISH",
        Allocations: [
          {
            Sku: "RUSTY-SOAPDISH",
            OrderId: "order999",
            Quantity: 15,
          },
        ],
        PK: "batch01",
        SK: "2021-04-20",
      },
    ]);
  });

  it("can retrieve a batch with allocations", async () => {
    await docClient
      .put({
        TableName: "Allocations",
        Item: {
          PK: "batch02",
          SK: "NONE",
          Reference: "batch02",
          Sku: "VELVET-SOFA",
          PurchasedQuantity: 20,
          Eta: "NONE",
          Allocations: [
            { OrderId: "order123", Quantity: 2, Sku: "VELVET-SOFA" },
          ],
        },
      })
      .promise();

    const repo = new DynamoDbRepository(docClient);
    const retrieved = await repo.get("batch02");

    expect(retrieved.reference).toBe("batch02");
    expect(retrieved.sku).toBe("VELVET-SOFA");
    expect(retrieved.purchasedQuantity).toBe(20);
    expect(retrieved.eta).toBeUndefined();
    expect(retrieved.allocations).toEqual(
      new Set([new OrderLine("order123", "VELVET-SOFA", 2)])
    );
  });

  it("can list batches", async () => {
    await docClient
      .put({
        TableName: "Allocations",
        Item: {
          PK: "batch01",
          SK: "2022-01-01",
          Reference: "batch01",
          Sku: "VELVET-SOFA",
          PurchasedQuantity: 20,
          Eta: "2022-01-01",
          Allocations: [],
        },
      })
      .promise();
    await docClient
      .put({
        TableName: "Allocations",
        Item: {
          PK: "batch02",
          SK: "NONE",
          Reference: "batch02",
          Sku: "VELVET-SOFA",
          PurchasedQuantity: 20,
          Eta: "NONE",
          Allocations: [
            { Sku: "VELVET-SOFA", Quantity: 17, OrderId: "order-001" },
          ],
        },
      })
      .promise();

    const repo = new DynamoDbRepository(docClient);
    const retrieved = await repo.list();

    expect(retrieved).toStrictEqual([
      new Batch("batch01", "VELVET-SOFA", 20, new Date("2022-01-01")),
      new Batch(
        "batch02",
        "VELVET-SOFA",
        20,
        undefined,
        new Set([new OrderLine("order-001", "VELVET-SOFA", 17)])
      ),
    ]);
  });
});