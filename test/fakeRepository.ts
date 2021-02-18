import { AbstractRepository } from "../src/adapters/repository";
import * as model from "../src/domain/model";

function cloneBatch(original: model.Batch): model.Batch {
  const clone = Object.assign(
    Object.create(Object.getPrototypeOf(original)),
    original
  );
  clone.allocations = new Set(clone.allocations);
  return clone;
}

export class FakeRepository implements AbstractRepository {
  private readonly batches: { [reference: string]: model.Batch } = {};

  constructor(batches: model.Batch[] = []) {
    batches.forEach((batch) => (this.batches[batch.reference] = batch));
  }

  public add(batch: model.Batch): void {
    this.batches[batch.reference] = batch;
  }

  public get(reference: string): model.Batch | undefined {
    return cloneBatch(this.batches[reference]);
  }

  public list(): model.Batch[] {
    return Object.values(this.batches).map(cloneBatch);
  }
}
