import { Event, EventTypes, OutOfStockEvent } from "../domain/events";
import { sendEmail } from "../adapters/email";

type Handler = (event: Event) => void;
type Handlers = {
  [type in EventTypes]: Handler[];
};

const sendOutOfStockNotification: Handler = (event: OutOfStockEvent) => {
  sendEmail("stock@made.com", `Out of stock for ${event.sku}`);
};

export class Messagebus {
  private HANDLERS: Handlers = {
    [EventTypes.OutOfStock]: [sendOutOfStockNotification],
  };

  public handle(events: Event[]): void {
    for (let event of events) {
      for (let handler of this.HANDLERS[event.type]) {
        handler(event);
      }
    }
  }
}
