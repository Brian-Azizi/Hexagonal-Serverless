import * as model from "./model";
import { AbstractRepository } from "./repository";

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
  line: model.OrderLine,
  repo: AbstractRepository
) => {
  const batches = await repo.list();
  if (!isValidSku(line.sku, batches)) {
    throw new InvalidSkuError(`Invalid sku ${line.sku}`);
  }

  const batchref = model.allocate(line, batches);
  // TODO: commit batches
  return batchref;
};
