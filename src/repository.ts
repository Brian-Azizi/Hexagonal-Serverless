import { Batch } from "./model";
import { DynamoDbDocumentClient } from "./documentClient";
abstract class AbstractRepository {
  public abstract add(batch: Batch): void;
  public abstract get(reference: string): Batch;
}

export class DynamoDbRepository extends AbstractRepository {
  private readonly TABLE_NAME = "Batches";

  constructor(private readonly documentClient: DynamoDbDocumentClient) {
    super();
  }

  public async add(batch: Batch): Promise<void> {
    const params = {
      TableName: this.TABLE_NAME,
      Item: {
        Reference: batch.reference,
        Sku: batch.sku,
        PurchasedQuantity: batch.purchasedQuantity,
        Eta: batch.eta?.toISOString().split("T")[0],
      },
    };

    await this.documentClient.put(params).promise();
    return;
  }
  public get(reference: string): Batch {
    throw new Error("Method not implemented.");
  }
}
