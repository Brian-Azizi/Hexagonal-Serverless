import { Product, Batch, OrderLine } from "../../src/domain/model";
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
    const product = new Product("MINIMALIST-SPOON", [medium, earliest, latest]);

    const line = new OrderLine("order1", "MINIMALIST-SPOON", 10);
    product.allocate(line);

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
    const product = new Product("HIGHBROW-POSTER", [
      shipmentBatch,
      inStockBatch,
    ]);

    const line = new OrderLine("o1", "HIGHBROW-POSTER", 10);
    const allocation = product.allocate(line);
    expect(allocation).toBe(inStockBatch);
  });

  it("increments version number", () => {
    const batch = new Batch("batch", "HIGHBROW-POSTER", 100);
    const product = new Product("HIGHBROW-POSTER", [batch], 7);
    const line = new OrderLine("o1", "HIGHBROW-POSTER", 10);

    product.allocate(line);
    expect(product.version).toBe(8);
  });

  it("records an OutOfStock event if cannot allocate", () => {
    const product = new Product("SMALL-FORK", [
      new Batch("batch", "HIGHBROW-POSTER", 10, today()),
    ]);
    product.allocate(new OrderLine("order1", "SMALL-FORK", 10));

    const batch = product.allocate(new OrderLine("order1", "SMALL-FORK", 1));

    const event = product.events.slice(-1)[0];
    expect(event.type).toBe("OutOfStock");
    expect(event.sku).toBe("SMALL-FORK");
  });
});
