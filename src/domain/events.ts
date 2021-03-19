export enum EventTypes {
  OutOfStock = "OutOfStock",
}

interface BaseEvent {
  type: EventTypes;
}

export interface OutOfStockEvent extends BaseEvent {
  sku: string;
}
export const outOfStockEvent = (sku: string): OutOfStockEvent => ({
  type: EventTypes.OutOfStock,
  sku,
});

export type Event = OutOfStockEvent;
