import { DynamoDbDocumentClient } from "./documentClient";
import { Batch, OrderLine, Product } from "../domain/model";

export abstract class AbstractRepository {
  public abstract add(batch: Batch): void | Promise<void>;
  public abstract get(
    reference: string
  ): Batch | undefined | Promise<Batch | undefined>;
  public abstract list(): Batch[] | Promise<Batch[]>;
}

export abstract class AbstractProductRepository {
  public abstract add(product: Product): void | Promise<void>;
  public abstract get(
    sku: string
  ): Product | undefined | Promise<Product | undefined>;
}

interface DynamoOrderLine {
  OrderId: string;
  Sku: string;
  Quantity: number;
}
interface DynamoBatch {
  PK: string;
  SK: string;
  Reference: string;
  Sku: string;
  PurchasedQuantity: number;
  Eta: "NONE" | string;
  Allocations: DynamoOrderLine[];
}
export class DynamoDbRepository implements AbstractRepository {
  private readonly TABLE_NAME = "Allocations";

  constructor(private readonly documentClient: DynamoDbDocumentClient) {}

  private createBatchFromDynamoItem = (item: DynamoBatch): Batch => {
    return new Batch(
      item?.Reference,
      item?.Sku,
      item?.PurchasedQuantity,
      item?.Eta === "NONE" ? undefined : new Date(item?.Eta),
      new Set(
        item?.Allocations.map(
          (line) => new OrderLine(line.OrderId, line.Sku, line.Quantity)
        )
      )
    );
  };

  public add = async (batch: Batch): Promise<void> => {
    const eta = batch.eta?.toISOString().split("T")[0] || "NONE";
    const params = {
      TableName: this.TABLE_NAME,
      Item: {
        PK: batch.reference,
        SK: eta,
        Reference: batch.reference,
        Sku: batch.sku,
        PurchasedQuantity: batch.purchasedQuantity,
        Eta: eta,
        Allocations: Array.from(batch.allocations).map((line) => ({
          OrderId: line.orderId,
          Sku: line.sku,
          Quantity: line.quantity,
        })),
      },
    };

    await this.documentClient.put(params).promise();
    return;
  };

  public get = async (reference: string): Promise<Batch | undefined> => {
    const { Items } = await this.documentClient
      .query({
        TableName: this.TABLE_NAME,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": reference,
        },
      })
      .promise();

    if (!Items) return undefined;
    return this.createBatchFromDynamoItem(Items[0] as DynamoBatch);
  };

  public list = async (): Promise<Batch[]> => {
    const { Items } = await this.documentClient
      .scan({
        TableName: this.TABLE_NAME,
      })
      .promise();

    if (!Items) return [];
    return Items.map((item) =>
      this.createBatchFromDynamoItem(item as DynamoBatch)
    );
  };
}

export class DynamoProductRepository implements AbstractProductRepository {
  private readonly TABLE_NAME = "AllocationProducts";

  constructor(private readonly documentClient: DynamoDbDocumentClient) {}

  public async add(product: Product): Promise<void> {
    await this.documentClient
      .batchWrite({
        RequestItems: {
          [this.TABLE_NAME]: [
            {
              PutRequest: {
                Item: {
                  PK: product.sku,
                  SK: `PRODUCT`,
                  Sku: product.sku,
                },
              },
            },
            ...product.batches.map((batch) => ({
              PutRequest: {
                Item: {
                  PK: batch.sku,
                  SK: `BATCH#${batch.reference}`,
                  Reference: batch.reference,
                  Sku: batch.sku,
                  PurchasedQuantity: batch.purchasedQuantity,
                  Eta: batch.eta?.toISOString().split("T")[0] || "NONE",
                  Allocations: Array.from(batch.allocations).map((line) => ({
                    OrderId: line.orderId,
                    Sku: line.sku,
                    Quantity: line.quantity,
                  })),
                },
              },
            })),
          ],
        },
      })
      .promise();
  }

  public async get(sku: string): Promise<Product | undefined> {
    const { Items } = await this.documentClient
      .query({
        TableName: "AllocationProducts",
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": sku,
        },
      })
      .promise();

    if (!Items) {
      return;
    }

    const productRow = Items.find((Item) => Item.SK === "PRODUCT");
    const batchRows = Items.filter((Item) =>
      Item.SK.startsWith("BATCH")
    ) as DynamoBatch[];

    if (!productRow) {
      return;
    }

    const batches = batchRows.map(this.createBatchFromDynamoItem);
    const product = new Product(productRow.Sku, batches);

    return product;
  }

  private createBatchFromDynamoItem = (item: DynamoBatch): Batch => {
    return new Batch(
      item?.Reference,
      item?.Sku,
      item?.PurchasedQuantity,
      item?.Eta === "NONE" ? undefined : new Date(item?.Eta),
      new Set(
        item?.Allocations.map(
          (line) => new OrderLine(line.OrderId, line.Sku, line.Quantity)
        )
      )
    );
  };
}
