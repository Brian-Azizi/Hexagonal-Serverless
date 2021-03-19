import { Event, EventTypes, OutOfStockEvent } from "../domain/events";
import { sendEmail } from "../adapters/email";

const sendOutOfStockNotification = (event: OutOfStockEvent) => {
  sendEmail("stock@made.com", `Out of stock for ${event.sku}`);
};

type Handler = (event: Event) => void;
type Handlers = {
  [type in EventTypes]: Handler[];
};

const HANDLERS: Handlers = {
  [EventTypes.OutOfStock]: [sendOutOfStockNotification],
};

export function handle(event: Event): void {
  for (let handler of HANDLERS[event.type]) {
    handler(event);
  }
}
