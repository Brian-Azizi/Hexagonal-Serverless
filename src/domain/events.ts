enum DomainEventTypes {
  OutOfStock = "OutOfStock",
}

interface BaseEvent {
  type: DomainEventTypes;
}

export interface OutOfStockEvent extends BaseEvent {
  sku: string;
}
export const outOfStockEvent = (sku: string): OutOfStockEvent => ({
  type: DomainEventTypes.OutOfStock,
  sku,
});

export type Event = OutOfStockEvent;
