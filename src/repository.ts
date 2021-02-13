import { Batch, OrderLine } from "./model";
import { DynamoDbDocumentClient } from "./documentClient";
abstract class AbstractRepository {
  public abstract add(batch: Batch): void | Promise<void>;
  public abstract get(
    reference: string
  ): Batch | undefined | Promise<Batch | undefined>;
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
export class DynamoDbRepository extends AbstractRepository {
  private readonly TABLE_NAME = "Allocations";

  constructor(private readonly documentClient: DynamoDbDocumentClient) {
    super();
  }

  private createBatchFromDynamoItem(item: DynamoBatch): Batch {
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
  }

  public async add(batch: Batch): Promise<void> {
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
  }

  public async get(reference: string): Promise<Batch | undefined> {
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
  }

  public async list(): Promise<Batch[]> {
    const { Items } = await this.documentClient
      .scan({
        TableName: this.TABLE_NAME,
      })
      .promise();

    if (!Items) return [];
    return Items.map((item) =>
      this.createBatchFromDynamoItem(item as DynamoBatch)
    );
  }
}

export class FakeRepository extends AbstractRepository {
  private readonly batches: Set<Batch>;

  constructor(batches: Batch[] = []) {
    super();
    this.batches = new Set(batches);
  }

  public add(batch: Batch): void {
    this.batches.add(batch);
  }

  public get(reference: string): Batch | undefined {
    return Array.from(this.batches).find(
      (batch) => batch.reference === reference
    );
  }

  public list(): Batch[] {
    return Array.from(this.batches);
  }
}
