import { DynamoDbDocumentClient } from "../../src/adapters/documentClient";
import { Batch, OrderLine, Product } from "../../src/domain/model";
import { DynamoProductRepository } from "../../src/adapters/repository";
import * as uuid from "uuid";

describe("DynamoProductRepository", () => {
  const docClient = new DynamoDbDocumentClient();

  it("can save a product", async () => {
    const ref = uuid.v4();
    const sku = "RUSTY-SOAPDISH";
    const batch = new Batch(
      ref,
      sku,
      100,
      new Date(Date.UTC(2021, 3, 20)),
      new Set([new OrderLine("order999", sku, 15)])
    );
    const product = new Product(sku, [batch]);

    const repo = new DynamoProductRepository(docClient);
    await repo.add(product);

    const { Items } = await docClient
      .query({
        TableName: "AllocationProducts",
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": sku,
        },
      })
      .promise();
    expect(Items).toStrictEqual(
      expect.arrayContaining([
        {
          PK: sku,
          SK: "PRODUCT",
          Sku: sku,
        },
        {
          PK: sku,
          SK: `BATCH#${ref}`,
          Eta: "2021-04-20",
          PurchasedQuantity: 100,
          Reference: ref,
          Sku: "RUSTY-SOAPDISH",
          Allocations: [
            {
              Sku: "RUSTY-SOAPDISH",
              OrderId: "order999",
              Quantity: 15,
            },
          ],
        },
      ])
    );
  });

  it("can retrieve a product", async () => {
    const sku = "VELVET-SOFA";
    const ref1 = "firstBatch";
    const ref2 = "secondBatch";

    await docClient
      .batchWrite({
        RequestItems: {
          AllocationProducts: [
            {
              PutRequest: {
                Item: {
                  PK: sku,
                  SK: `PRODUCT`,
                  Sku: sku,
                },
              },
            },
            {
              PutRequest: {
                Item: {
                  PK: sku,
                  SK: `BATCH#${ref1}`,
                  Reference: ref1,
                  Sku: sku,
                  PurchasedQuantity: 20,
                  Eta: "NONE",
                  Allocations: [
                    { OrderId: "order123", Quantity: 12, Sku: sku },
                  ],
                },
              },
            },
            {
              PutRequest: {
                Item: {
                  PK: sku,
                  SK: `BATCH#${ref2}`,
                  Reference: ref2,
                  Sku: sku,
                  PurchasedQuantity: 26,
                  Eta: "2021-12-02",
                  Allocations: [
                    { OrderId: "order999", Quantity: 10, Sku: sku },
                  ],
                },
              },
            },
          ],
        },
      })
      .promise();

    const repo = new DynamoProductRepository(docClient);
    const product = await repo.get(sku);

    expect(product).toBeDefined();
    expect(product.sku).toBe("VELVET-SOFA");
    expect(product.batches.length).toBe(2);

    const batch1 = product.batches.find((batch) => batch.reference === ref1);
    expect(batch1.reference).toBe(ref1);
    expect(batch1.purchasedQuantity).toBe(20);
    expect(batch1.eta).toBeUndefined();
    expect(batch1.allocations).toEqual(
      new Set([new OrderLine("order123", "VELVET-SOFA", 12)])
    );

    const batch2 = product.batches.find((batch) => batch.reference === ref2);
    expect(batch2.reference).toBe(ref2);
    expect(batch2.purchasedQuantity).toBe(26);
    expect(batch2.eta).toEqual(new Date("2021-12-02"));
    expect(batch2.allocations).toEqual(
      new Set([new OrderLine("order999", "VELVET-SOFA", 10)])
    );
  });
});
