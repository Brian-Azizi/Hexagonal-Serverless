import * as services from "../../src/servicelayer/services";
import { FakeProductRepository } from "../FakeProductRepository";
import { today, tomorrow } from "../utils";

describe("Allocate service", () => {
  it("returns an allocation", async () => {
    const repo = new FakeProductRepository();
    await services.addBatch(repo)("b1", "COMPLICATED-LAMP", 100, undefined);
    const result = await services.allocate(repo)("o1", "COMPLICATED-LAMP", 10);
    expect(result).toBe("b1");
  });

  it("throws an error for invalid SKUs", async () => {
    const repo = new FakeProductRepository();
    await services.addBatch(repo)("b1", "AREAL-SKU", 100, undefined);
    expect.assertions(2);
    try {
      await services.allocate(repo)("o1", "NONEXISTENT-SKU", 10);
    } catch (e) {
      expect(e).toBeInstanceOf(services.InvalidSkuError);
      expect(e.message).toContain("Invalid sku NONEXISTENT-SKU");
    }
  });

  it("persists allocations", async () => {
    const repo = new FakeProductRepository();
    await services.addBatch(repo)("b1", "COFFEE-TABLE", 10, today());
    await services.addBatch(repo)("b2", "COFFEE-TABLE", 10, tomorrow());

    // first order uses up all stock in batch1
    const r1 = await services.allocate(repo)("order1", "COFFEE-TABLE", 10);
    expect(r1).toBe("b1");

    // second order should go to batch 2
    const r2 = await services.allocate(repo)("order2", "COFFEE-TABLE", 10);
    expect(r2).toBe("b2");
  });

  it("prefers warehouse batches to shipments", async () => {
    const repo = new FakeProductRepository();
    await services.addBatch(repo)(
      "in-stock-batch",
      "RETRO-CLOCK",
      100,
      undefined
    );
    await services.addBatch(repo)(
      "shipment-batch",
      "RETRO-CLOCK",
      100,
      tomorrow()
    );

    await services.allocate(repo)("oref", "RETRO-CLOCK", 10);

    const product = await repo.get("RETRO-CLOCK");
    if (!product) fail();
    expect(
      product.batches.find((batch) => batch.reference === "in-stock-batch")
        .availableQuantity
    ).toBe(90);
    expect(
      product.batches.find((batch) => batch.reference === "shipment-batch")
        .availableQuantity
    ).toBe(100);
  });
});

describe("Add batch service", () => {
  it("adds a batch", async () => {
    const repo = new FakeProductRepository();
    await services.addBatch(repo)("b1", "CRUNCHY-ARMCHAIR", 100, undefined);
    expect((await repo.get("CRUNCHY-ARMCHAIR")).batches).toBeDefined();
  });
});
