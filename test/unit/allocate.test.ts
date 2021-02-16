import {
  allocate,
  Batch,
  OrderLine,
  OutOfStockError,
} from "../../src/domain/model";
import { later, today, tomorrow } from "../utils";

describe("allocate", () => {
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
    const line = new OrderLine("o1", "HIGHBROW-POSTER", 10);

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