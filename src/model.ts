export class OrderLine {
  public constructor(
    readonly orderId: string,
    readonly sku: string,
    readonly quantity: number
  ) {}
}

export class Batch {
  public readonly ref: string;
  public readonly sku: string;
  public eta?: Date;

  private _purchasedQuantity: number;
  private _allocations: Set<OrderLine>;

  constructor(
    batchRef: string,
    batchSku: string,
    quantity: number,
    eta?: Date
  ) {
    this.ref = batchRef;
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
