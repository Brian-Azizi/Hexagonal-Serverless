export class OrderLine {
  public constructor(
    readonly orderId: string,
    readonly sku: string,
    readonly quantity: number
  ) {}
}

export class Batch {
  public readonly reference: string;
  public readonly sku: string;
  public eta?: Date;

  private _purchasedQuantity: number;
  private _allocations: Set<OrderLine>;

  public static sortByEta(left: Batch, right: Batch): number {
    if (!left.eta) return -1;
    else if (!right.eta) return 1;
    return left.eta.getTime() - right.eta.getTime();
  }

  constructor(ref: string, batchSku: string, quantity: number, eta?: Date) {
    this.reference = ref;
    this.sku = batchSku;
    this.eta = eta;
    this._purchasedQuantity = quantity;
    this._allocations = new Set();
  }

  public allocate(line: OrderLine) {
    if (this.canAllocate(line)) {
      this._allocations.add(line);
    }
  }

  public canAllocate(line: OrderLine): boolean {
    return this.sku === line.sku && this.availableQuantity >= line.quantity;
  }

  get allocatedQuantity(): number {
    return Array.from(this._allocations)
      .map((line) => line.quantity)
      .reduce((previous, current) => previous + current, 0);
  }

  get availableQuantity() {
    return this._purchasedQuantity - this.allocatedQuantity;
  }

  public deallocate(line: OrderLine) {
    if (this._allocations.has(line)) {
      this._allocations.delete(line);
    }
  }
}

export function allocate(line: OrderLine, batches: Batch[]): string {
  const batch = batches
    .filter((b) => b.canAllocate(line))
    .sort(Batch.sortByEta)[0];

  if (batch === undefined) {
    throw new OutOfStockError(`Out of stock for sku ${line.sku}`);
  }

  batch.allocate(line);
  return batch.reference;
}

export class OutOfStockError extends Error {
  public readonly rootError?: Error;

  public constructor(message: string, rootError?: Error) {
    super(message);
    this.name = "OutOfStockError";
    this.rootError = rootError;
  }
}
