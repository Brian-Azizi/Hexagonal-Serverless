import { Batch, OrderLine, allocate, OutOfStockError } from "../src/model";
import { today, tomorrow, later } from "./dateUtils";

describe("allocate", () => {
  it("prefers current stock batches to shipments", () => {
    const inStockBatch = new Batch("in-stock-batch", "RETRO-CLOCK", 100);
    const shipmentBatch = new Batch(
      "shipment-batch",
      "RETRO-CLOCK",
      100,
      tomorrow()
    );
    const line = new OrderLine("oref", "RETRO-CLOCK", 10);

    allocate(line, [inStockBatch, shipmentBatch]);

    expect(inStockBatch.availableQuantity).toBe(90);
    expect(shipmentBatch.availableQuantity).toBe(100);
  });

  it("prefers earlier batches", () => {
    const earliest = new Batch(
      "speedy-batch",
      "MINIMALIST-SPOON",
      100,
      today()
    );
    const medium = new Batch(
      "normal-batch",
      "MINIMALIST-SPOON",
      100,
      tomorrow()
    );
    const latest = new Batch("slow-batch", "MINIMALIST-SPOON", 100, later());
    const line = new OrderLine("order1", "MINIMALIST-SPOON", 10);

    allocate(line, [medium, earliest, latest]);

    expect(earliest.availableQuantity).toBe(90);
    expect(medium.availableQuantity).toBe(100);
    expect(latest.availableQuantity).toBe(100);
  });

  it("returns the ref of the allocated batch", () => {
    const inStockBatch = new Batch("in-stock-batch", "HIGHBROW-POSTER", 100);
    const shipmentBatch = new Batch(
      "shipment-batch",
      "HIGHBROW-POSTER",
      100,
      tomorrow()
    );
    const line = new OrderLine("oref", "HIGHBROW-POSTER", 10);

    const allocation = allocate(line, [shipmentBatch, inStockBatch]);
    expect(allocation).toBe(inStockBatch.reference);
  });

  it("throws an OutOfStockError if it cannot allocate", () => {
    const batch = new Batch("batch1", "SMALL-FORK", 10, today());
    allocate(new OrderLine("order1", "SMALL-FORK", 10), [batch]);

    expect.assertions(2);
    try {
      allocate(new OrderLine("order1", "SMALL-FORK", 10), [batch]);
    } catch (e) {
      expect(e).toBeInstanceOf(OutOfStockError);
      expect(e.message).toContain("SMALL-FORK");
    }
  });
});
