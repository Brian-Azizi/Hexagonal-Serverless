import { AbstractRepository } from "../adapters/repository";
import * as model from "../domain/model";

export class InvalidSkuError extends Error {
  public readonly rootError?: Error;

  public constructor(message: string, rootError?: Error) {
    super(message);
    this.name = "InvalidSkuError";
    this.rootError = rootError;
  }
}

const isValidSku = (sku: string, batches: model.Batch[]) =>
  batches.map((b) => b.sku).includes(sku);

export const allocate = (repo: AbstractRepository) => async (
  orderId: string,
  sku: string,
  quantity: number
): Promise<string> => {
  const batches = await repo.list();
  if (!isValidSku(sku, batches)) {
    throw new InvalidSkuError(`Invalid sku ${sku}`);
  }

  const line = new model.OrderLine(orderId, sku, quantity);
  const batchref = model.allocate(line, batches);

  const batch = batches.find((b) => b.reference === batchref) as model.Batch;
  await repo.add(batch);

  return batchref;
};

export const addBatch = (repository: AbstractRepository) => async (
  reference: string,
  sku: string,
  quantity: number,
  eta: Date | undefined
): Promise<void> => {
  await repository.add(new model.Batch(reference, sku, quantity, eta));
};
