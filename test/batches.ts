import { Batch, OrderLine } from "../src/model";

describe("allocating to a batch", () => {
  it("reduces the available quantity", () => {
    const batch = new Batch("batch-001", "SMALL-TABLE", 20, new Date());
    const line = new OrderLine("order-ref", "SMALL-TABLE", 2);

    batch.allocate(line);

    expect(batch.availableQuantity).toBe(18);
  });
});
