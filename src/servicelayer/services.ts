import { AbstractProductRepository } from "../adapters/repository";
import * as model from "../domain/model";

export class InvalidSkuError extends Error {
  public readonly rootError?: Error;

  public constructor(message: string, rootError?: Error) {
    super(message);
    this.name = "InvalidSkuError";
    this.rootError = rootError;
  }
}

export const allocate = (repo: AbstractProductRepository) => async (
  orderId: string,
  sku: string,
  quantity: number
): Promise<string> => {
  const product = await repo.get(sku);
  if (!product) {
    throw new InvalidSkuError(`Invalid sku ${sku}`);
  }

  const line = new model.OrderLine(orderId, sku, quantity);
  const batch = product.allocate(line);
  await repo.add(product);

  return batch.reference;
};

export const addBatch = (repository: AbstractProductRepository) => async (
  reference: string,
  sku: string,
  quantity: number,
  eta: Date | undefined
): Promise<void> => {
  let product = await repository.get(sku);
  if (!product) {
    product = new model.Product(sku, []);
  }
  product.batches.push(new model.Batch(reference, sku, quantity, eta));
  await repository.add(product);
};
