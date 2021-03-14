import { DynamoDbDocumentClient } from "./documentClient";
import { Batch, OrderLine, Product } from "../domain/model";

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
export class DynamoProductRepository implements AbstractProductRepository {
  private readonly TABLE_NAME = "AllocationProducts";

  constructor(private readonly documentClient: DynamoDbDocumentClient) {}

  public async add(product: Product): Promise<void> {
    await this.documentClient
      .transactWrite({
        TransactItems: [
          // {
          //   ConditionCheck: {
          //     TableName: this.TABLE_NAME,
          //     Key: {
          //       PK: product.sku,
          //       SK: `PRODUCT`,
          //     },
          //     ConditionExpression:
          //       "(attribute_not_exists(Version)) OR (Version < :version)",
          //     ExpressionAttributeValues: {
          //       ":version": product.version,
          //     },
          //   },
          // },
          {
            Put: {
              TableName: this.TABLE_NAME,
              Item: {
                PK: product.sku,
                SK: `PRODUCT`,
                Sku: product.sku,
                Version: product.version,
              },
              ConditionExpression:
                "(attribute_not_exists(Version)) OR (Version < :version)",
              ExpressionAttributeValues: {
                ":version": product.version,
              },
            },
          },
          ...product.batches.map((batch) => ({
            Put: {
              TableName: this.TABLE_NAME,
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
    const product = new Product(productRow.Sku, batches, productRow.Version);

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
