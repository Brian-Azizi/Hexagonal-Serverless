import { DynamoDbDocumentClient } from "../../src/adapters/documentClient";
import { Batch, OrderLine, Product } from "../../src/domain/model";
import {
  DynamoDbRepository,
  DynamoProductRepository,
} from "../../src/adapters/repository";
import * as uuid from "uuid";
import { emptyTable } from "../utils";

describe("DynamoDbRepository", () => {
  const docClient = new DynamoDbDocumentClient();

  it("can save a batch", async () => {
    const ref = uuid.v4();
    const batch = new Batch(
      ref,
      "RUSTY-SOAPDISH",
      100,
      new Date(Date.UTC(2021, 3, 20)),
      new Set([new OrderLine("order999", "RUSTY-SOAPDISH", 15)])
    );
    const repo = new DynamoDbRepository(docClient);
    await repo.add(batch);

    const { Items } = await docClient
      .query({
        TableName: "Allocations",
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": ref,
        },
      })
      .promise();
    expect(Items).toStrictEqual([
      {
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
        PK: ref,
        SK: "2021-04-20",
      },
    ]);
  });

  it("can retrieve a batch with allocations", async () => {
    const ref = uuid.v4();
    await docClient
      .put({
        TableName: "Allocations",
        Item: {
          PK: ref,
          SK: "NONE",
          Reference: ref,
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
    const retrieved = <Batch>await repo.get(ref);

    expect(retrieved).toBeDefined();
    expect(retrieved.reference).toBe(ref);
    expect(retrieved.sku).toBe("VELVET-SOFA");
    expect(retrieved.purchasedQuantity).toBe(20);
    expect(retrieved.eta).toBeUndefined();
    expect(retrieved.allocations).toEqual(
      new Set([new OrderLine("order123", "VELVET-SOFA", 2)])
    );
  });

  it("can list batches", async () => {
    await emptyTable(docClient);

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

    expect(retrieved.sort(Batch.sortByEta)).toStrictEqual(
      [
        new Batch(
          "batch02",
          "VELVET-SOFA",
          20,
          undefined,
          new Set([new OrderLine("order-001", "VELVET-SOFA", 17)])
        ),
        new Batch("batch01", "VELVET-SOFA", 20, new Date("2022-01-01")),
      ].sort(Batch.sortByEta)
    );
  });
});

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
    expect(Items).toStrictEqual([
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
    ]);
  });

  it("can retrieve a product", async () => {
    const sku = "VELVET-SOFA";
    const ref1 = uuid.v4();
    const ref2 = uuid.v4();
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
    expect(product.batches[0].reference).toBe(ref1);
    expect(product.batches[0].purchasedQuantity).toBe(20);
    expect(product.batches[0].eta).toBeUndefined();
    expect(product.batches[0].allocations).toEqual(
      new Set([new OrderLine("order123", "VELVET-SOFA", 12)])
    );
    expect(product.batches[1].reference).toBe(ref1);
    expect(product.batches[1].purchasedQuantity).toBe(26);
    expect(product.batches[1].eta).toEqual(new Date("2021-12-02"));
    expect(product.batches[1].allocations).toEqual(
      new Set([new OrderLine("order999", "VELVET-SOFA", 10)])
    );
  });
});
