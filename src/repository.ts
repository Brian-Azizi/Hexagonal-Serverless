import { Batch, OrderLine } from "./model";
import { DynamoDbDocumentClient } from "./documentClient";
abstract class AbstractRepository {
  public abstract add(batch: Batch): void;
  public abstract get(reference: string): Promise<Batch>;
}

export class DynamoDbRepository extends AbstractRepository {
  private readonly TABLE_NAME = "Allocations";

  constructor(private readonly documentClient: DynamoDbDocumentClient) {
    super();
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

  public async get(reference: string): Promise<Batch> {
    const { Items: batchItems } = await this.documentClient
      .query({
        TableName: this.TABLE_NAME,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": reference,
        },
      })
      .promise();
    const batchData = batchItems && batchItems[0];
    return new Batch(
      batchData?.Reference,
      batchData?.Sku,
      batchData?.PurchasedQuantity,
      batchData?.Eta === "NONE" ? undefined : new Date(batchData?.Eta),
      new Set(
        batchData?.Allocations.map(
          (line: { OrderId: string; Sku: string; Quantity: number }) =>
            new OrderLine(line.OrderId, line.Sku, line.Quantity)
        )
      )
    );
  }

  public async list(): Promise<Batch[]> {
    const { Items } = await this.documentClient
      .scan({
        TableName: this.TABLE_NAME,
      })
      .promise();

    return (
      Items?.map(
        (item) =>
          new Batch(
            item.Reference,
            item.Sku,
            item.PurchasedQuantity,
            item?.Eta === "NONE" ? undefined : new Date(item?.Eta),
            new Set(
              item?.Allocations.map(
                (line: { OrderId: string; Sku: string; Quantity: number }) =>
                  new OrderLine(line.OrderId, line.Sku, line.Quantity)
              )
            )
          )
      ) || []
    );
  }
}
