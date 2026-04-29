import { EventEmitter } from "events";

declare module "ws" {
  export class WebSocketServer extends EventEmitter {
    constructor(options: { port: number });
    close(): void;
  }
}
