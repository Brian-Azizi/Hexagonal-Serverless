import * as model from "../src/model";
import { AbstractRepository } from "../src/repository";
import * as services from "../src/services";

class FakeRepository implements AbstractRepository {
  private readonly batches: Set<model.Batch>;
  public committed: boolean = false;

  constructor(batches: model.Batch[] = []) {
    this.batches = new Set(batches);
  }

  public commit(): void {
    this.committed = true;
  }

  public add(batch: model.Batch): void {
    this.batches.add(batch);
  }

  public get(reference: string): model.Batch | undefined {
    return Array.from(this.batches).find(
      (batch) => batch.reference === reference
    );
  }

  public list(): model.Batch[] {
    return Array.from(this.batches);
  }
}

describe("Allocate service", () => {
  it("returns an allocation", async () => {
    const line = new model.OrderLine("o1", "COMPLICATED-LAMP", 10);
    const batch = new model.Batch("b1", "COMPLICATED-LAMP", 100);
    const repo = new FakeRepository([batch]);

    const result = await services.allocate(line, repo);
    expect(result).toBe("b1");
  });

  it("throws an error for invalid SKUs", async () => {
    const line = new model.OrderLine("o1", "NONEXISTENT-SKU", 10);
    const batch = new model.Batch("b1", "AREAL-SKU", 100);
    const repo = new FakeRepository([batch]);

    expect.assertions(2);
    try {
      await services.allocate(line, repo);
    } catch (e) {
      expect(e).toBeInstanceOf(services.InvalidSkuError);
      expect(e.message).toContain("Invalid sku NONEXISTENT-SKU");
    }
  });

  it("commits the session", async () => {
    const line = new model.OrderLine("o1", "OMINOUS-MIRROR", 10);
    const batch = new model.Batch("b1", "OMINOUS-MIRROR", 100);
    const repo = new FakeRepository([batch]);

    await services.allocate(line, repo);
    expect(repo.committed).toBe(true);
  });
});
