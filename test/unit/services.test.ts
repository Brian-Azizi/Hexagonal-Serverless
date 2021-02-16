import * as model from "../../src/domain/model";
import { AbstractRepository } from "../../src/adapters/repository";
import * as services from "../../src/servicelayer/services";
import { today, tomorrow } from "../utils";

class FakeRepository implements AbstractRepository {
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

  it("persists allocations", async () => {
    const batch1 = new model.Batch("b1", "COFFEE-TABLE", 10, today());
    const batch2 = new model.Batch("b2", "COFFEE-TABLE", 10, tomorrow());
    const repo = new FakeRepository([batch2, batch1]);

    const line1 = new model.OrderLine("order1", "COFFEE-TABLE", 10);
    const line2 = new model.OrderLine("order2", "COFFEE-TABLE", 10);

    // first order uses up all stock in batch1
    const r1 = await services.allocate(line1, repo);
    expect(r1).toBe("b1");

    // second order should go to batch 2
    const r2 = await services.allocate(line2, repo);
    expect(r2).toBe("b2");
  });

  it("commits the session", async () => {
    const line = new model.OrderLine("o1", "OMINOUS-MIRROR", 10);
    const batch = new model.Batch("b1", "OMINOUS-MIRROR", 100);
    const repo = new FakeRepository([batch]);

    await services.allocate(line, repo);
    expect(repo.committed).toBe(true);
  });

  it("prefers warehouse batches to shipments", async () => {
    const inStockBatch = new model.Batch("in-stock-batch", "RETRO-CLOCK", 100);
    const shipmentBatch = new model.Batch(
      "shipment-batch",
      "RETRO-CLOCK",
      100,
      tomorrow()
    );
    const repo = new FakeRepository([inStockBatch, shipmentBatch]);

    const line = new model.OrderLine("oref", "RETRO-CLOCK", 10);
    await services.allocate(line, repo);

    expect(inStockBatch.availableQuantity).toBe(90);
    expect(shipmentBatch.availableQuantity).toBe(100);
  });
});
