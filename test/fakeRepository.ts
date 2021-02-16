import { AbstractRepository } from "../src/adapters/repository";
import * as model from "../src/domain/model";

export class FakeRepository implements AbstractRepository {
  private readonly batches: { [reference: string]: model.Batch } = {};
  public committed: boolean = false;

  constructor(batches: model.Batch[] = []) {
    batches.forEach((batch) => (this.batches[batch.reference] = batch));
  }

  public commit(): void {
    this.committed = true;
  }

  public add(batch: model.Batch): void {
    this.batches[batch.reference] = batch;
  }

  public get(reference: string): model.Batch | undefined {
    return this.batches[reference];
  }

  public list(): model.Batch[] {
    return Object.values(this.batches);
  }
}
