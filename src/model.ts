export class OrderLine {
  public constructor(
    readonly orderId: string,
    readonly sku: string,
    readonly quantity: number
  ) {}
}

export class Batch {
  readonly ref: string;
  readonly sku: string;
  availableQuantity: number;
  eta?: Date;

  constructor(
    batchRef: string,
    batchSku: string,
    availableQuantity: number,
    eta?: Date
  ) {
    this.ref = batchRef;
    this.sku = batchSku;
    this.availableQuantity = availableQuantity;
    this.eta = eta;
  }

  public allocate(line: OrderLine) {
    this.availableQuantity -= line.quantity;
  }
}
