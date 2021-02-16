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

export const allocate = async (
  orderId: string,
  sku: string,
  quantity: number,
  repo: AbstractRepository
): Promise<string> => {
  const batches = await repo.list();
  if (!isValidSku(sku, batches)) {
    throw new InvalidSkuError(`Invalid sku ${sku}`);
  }

  const line = new model.OrderLine(orderId, sku, quantity);
  const batchref = model.allocate(line, batches);
  await repo.commit();
  return batchref;
};

export const addBatch = async (
  reference: string,
  sku: string,
  quantity: number,
  eta: Date | undefined,
  repository: AbstractRepository
): Promise<void> => {
  await repository.add(new model.Batch(reference, sku, quantity, eta));
  await repository.commit();
};
