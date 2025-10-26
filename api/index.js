const http = require("http");
const url = require("url");
const net = require("node:net");
const { randomUUID } = require("node:crypto");

let clientId;
const PORT = process.env.PORT;
const proxy = net.connect("/tmp/proxy");

class EventQueue {
  static requests = new Map();

  static addRequestToQueue(id, res) {
    EventQueue.requests.set(id, res);
  }

  static onEventTriggered(data) {
    const msg = JSON.parse(data.toString());
    const requestId = msg.request_id;
    if (!requestId) {
      console.error("Missing request id: ", msg);
      return;
    }
    console.log("Data received: ", msg);
    const res = EventQueue.requests.get(requestId);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(msg.data));
    EventQueue.removeRequest(requestId);
  }

  static removeRequest(id) {
    EventQueue.requests.delete(id);
  }
}

const server = http.createServer(async (req, res) => {
  const method = req.method;
  const parsedUrl = url.parse(req.url, true);
  console.log("Data requested");
  if (method !== "GET" || parsedUrl.pathname !== "/") {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }
  if (!clientId) {
    console.error("Proxy connection not established!");
    res.writeHead(503);
    res.end("Service Unavailable");
    return;
  }

  const requestId = randomUUID();
  EventQueue.addRequestToQueue(requestId, res);
  proxy.write(JSON.stringify({ client_id: clientId, request_id: requestId, data: parsedUrl.query }));
  await new Promise((res) => setTimeout(res, 2000));
  if (EventQueue.requests.get(requestId)) {
    console.log("Request timed out");
    EventQueue.removeRequest(requestId);
    res.writeHead(500);
    res.end("Internal Server Error");
  }
});

server.listen(PORT, "0.0.0.0", async () => {
  const eventController = net.connect("/tmp/eventController");
  eventController.once("data", (buffer) => {
    const data = JSON.parse(buffer.toString());
    if (!data.client_id) {
      throw new Error("Unknown event occurred: ", data);
    }
    console.log("Client connected succesfully.");
    clientId = data.client_id;

    eventController.on("data", EventQueue.onEventTriggered);
  });

  for (let i = 0; i < 5; i++) {
    if (!clientId) {
      console.log("Waiting for connection to proxy...");
      await new Promise((res) => setTimeout(res, 1000));
      continue;
    }
  }
  if (!clientId) {
    throw new Error("Proxy failed to connect!");
  }
  console.log(`Server started on port: ${PORT}`);
});