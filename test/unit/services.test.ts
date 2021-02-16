import * as services from "../../src/servicelayer/services";
import { FakeRepository } from "../fakeRepository";
import { today, tomorrow } from "../utils";

describe("Allocate service", () => {
  it("returns an allocation", async () => {
    const repo = new FakeRepository();
    await services.addBatch("b1", "COMPLICATED-LAMP", 100, undefined, repo);
    const result = await services.allocate("o1", "COMPLICATED-LAMP", 10, repo);
    expect(result).toBe("b1");
  });

  it("throws an error for invalid SKUs", async () => {
    const repo = new FakeRepository();
    await services.addBatch("b1", "AREAL-SKU", 100, undefined, repo);
    expect.assertions(2);
    try {
      await services.allocate("o1", "NONEXISTENT-SKU", 10, repo);
    } catch (e) {
      expect(e).toBeInstanceOf(services.InvalidSkuError);
      expect(e.message).toContain("Invalid sku NONEXISTENT-SKU");
    }
  });

  it("persists allocations", async () => {
    const repo = new FakeRepository();
    await services.addBatch("b1", "COFFEE-TABLE", 10, today(), repo);
    await services.addBatch("b2", "COFFEE-TABLE", 10, tomorrow(), repo);

    // first order uses up all stock in batch1
    const r1 = await services.allocate("order1", "COFFEE-TABLE", 10, repo);
    expect(r1).toBe("b1");

    // second order should go to batch 2
    const r2 = await services.allocate("order2", "COFFEE-TABLE", 10, repo);
    expect(r2).toBe("b2");
  });

  it("commits the session", async () => {
    const repo = new FakeRepository();
    await services.addBatch("b1", "OMINOUS-MIRROR", 100, undefined, repo);

    await services.allocate("o1", "OMINOUS-MIRROR", 10, repo);
    expect(repo.committed).toBe(true);
  });

  it("prefers warehouse batches to shipments", async () => {
    const repo = new FakeRepository();
    await services.addBatch(
      "in-stock-batch",
      "RETRO-CLOCK",
      100,
      undefined,
      repo
    );
    await services.addBatch(
      "shipment-batch",
      "RETRO-CLOCK",
      100,
      tomorrow(),
      repo
    );

    await services.allocate("oref", "RETRO-CLOCK", 10, repo);

    expect(await repo.get("in-stock-batch").availableQuantity).toBe(90);
    expect(await repo.get("shipment-batch").availableQuantity).toBe(100);
  });
});

describe("Add batch service", () => {
  it("adds a batch", async () => {
    const repo = new FakeRepository();
    await services.addBatch("b1", "CRUNCHY-ARMCHAIR", 100, undefined, repo);
    expect(await repo.get("b1")).toBeDefined();
    expect(repo.committed).toBe(true);
  });
});
