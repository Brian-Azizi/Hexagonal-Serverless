import { DynamoDbDocumentClient } from "./documentClient";
import { Batch, OrderLine } from "./model";

export abstract class AbstractRepository {
  public abstract add(batch: Batch): void | Promise<void>;
  public abstract get(
    reference: string
  ): Batch | undefined | Promise<Batch | undefined>;
  public abstract list(): Batch[] | Promise<Batch[]>;
  public abstract commit(): void;
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
  private _batches: { [ref: string]: Batch } = {};

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
    const batch = this.createBatchFromDynamoItem(Items[0] as DynamoBatch);
    this._batches[batch.reference] = batch;
    return batch;
  };

  public list = async (): Promise<Batch[]> => {
    const { Items } = await this.documentClient
      .scan({
        TableName: this.TABLE_NAME,
      })
      .promise();

    if (!Items) return [];
    const batches = Items.map((item) =>
      this.createBatchFromDynamoItem(item as DynamoBatch)
    );
    batches.forEach((batch) => {
      this._batches[batch.reference] = batch;
    });
    return batches;
  };

  public async commit(): Promise<void> {
    await Promise.all(
      Object.values(this._batches).map((batch) => this.add(batch))
    );
  }
}
