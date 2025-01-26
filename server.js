import { createServer } from "http";
import { WebSocketServer } from "ws";
import next from "next";
import realtimeWs from "./src/server/realtimeWs";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const wss = new WebSocketServer({ server });

  realtimeWs(wss);

  server.listen(3000, () => {
    console.log("Server listening on http://localhost:3000");
  });
}); 