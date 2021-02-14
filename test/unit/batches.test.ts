import { Batch, OrderLine } from "../../src/domain/model";
import { today } from "../utils";

const makeBatchAndLine = (
  sku: string,
  batchQty: number,
  lineQty: number
): [Batch, OrderLine] => [
  new Batch("batch-001", sku, batchQty),
  new OrderLine("order-123", sku, lineQty),
];

describe("Batch", () => {
  describe("allocating lines", () => {
    it("reduces the available quantity", () => {
      const batch = new Batch("batch-001", "SMALL-TABLE", 20, today());
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

    it("is idempotent", () => {
      const [batch, line] = makeBatchAndLine("ELEGANT-LAMP", 20, 2);
      batch.allocate(line);
      batch.allocate(line);
      expect(batch.availableQuantity).toBe(18);
    });
  });

  describe("deallocating lines", () => {
    it("deallocates previously allocated lines", () => {
      const [batch, line] = makeBatchAndLine("DECORATIVE-TRINKET", 20, 2);
      batch.allocate(line);
      expect(batch.availableQuantity).toBe(18);
      batch.deallocate(line);
      expect(batch.availableQuantity).toBe(20);
    });

    it("can only deallocate allocated lines", () => {
      const [batch, unallocatedLine] = makeBatchAndLine(
        "DECORATIVE-TRINKET",
        20,
        2
      );
      batch.deallocate(unallocatedLine);
      expect(batch.availableQuantity).toBe(20);
    });
  });
});
