import { Batch } from "./model";

export abstract class AbstractRepository {
  public abstract add(batch: Batch): void;
  public abstract get(reference: string): Batch;
}
