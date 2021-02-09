import { Batch, OrderLine } from "../src/model";

const makeBatchAndLine = (
  sku: string,
  batchQty: number,
  lineQty: number
): [Batch, OrderLine] => [
  new Batch("batch-001", sku, batchQty),
  new OrderLine("order-123", sku, lineQty),
];

describe("allocating to a batch", () => {
  it("reduces the available quantity", () => {
    const batch = new Batch("batch-001", "SMALL-TABLE", 20, new Date());
    const line = new OrderLine("order-ref", "SMALL-TABLE", 2);

    batch.allocate(line);

    expect(batch.availableQuantity).toBe(18);
  });

  it("can allocate if the available quantity is greater than required", () => {
    const [largeBatch, smallLine] = makeBatchAndLine("ELEGANT-LAMP", 20, 2);
    expect(largeBatch.canAllocate(smallLine)).toBe(true);
  });

  it("cannot allocate if the available quantity is smaller than required", () => {
    const [smallBatch, largeLine] = makeBatchAndLine("ELEGANT-LAMP", 2, 20);
    expect(smallBatch.canAllocate(largeLine)).toBe(false);
  });

  it("can allocate if the available quantity is equal to required", () => {
    const [batch, line] = makeBatchAndLine("ELEGANT-LAMP", 2, 2);
    expect(batch.canAllocate(line)).toBe(true);
  });

  it("cannot allocate if the SKUs do not match", () => {
    const batch = new Batch("batch-001", "UNCOMFORTABLE-CHAIR", 100);
    const differentSkuLine = new OrderLine(
      "order-123",
      "EXPENSIVE-TOASTER",
      10
    );
    expect(batch.canAllocate(differentSkuLine)).toBe(false);
  });
});
