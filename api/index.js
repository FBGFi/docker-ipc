const http = require("http");
const url = require("url");
const net = require("node:net");

const PORT = process.env.PORT;
const eventController = net.connect("/tmp/eventController");
const proxy = net.connect("/tmp/proxy");

class EventQueue {
  static responseMap = {};

  static addRequestToQueue(id, res) {
    EventQueue.responseMap[id] = res;
  }

  static onEventTriggered(data) {
    console.log("Event triggered");
    const msg = JSON.parse(data.toString());
    console.log(msg);
    const res = EventQueue.responseMap.TEMP_ID;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(msg));
    EventQueue.removeRequest("TEMP_ID");
  }

  static removeRequest(id) {
    delete EventQueue.responseMap[id];
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

  EventQueue.addRequestToQueue("TEMP_ID", res);
  proxy.write(JSON.stringify(parsedUrl.query));
  await new Promise((res) => setTimeout(res, 1000));
  if (EventQueue.responseMap.TEMP_ID) {
    console.log("Request timed out");
    EventQueue.removeRequest("TEMP_ID");
    res.writeHead(500);
    res.end("Internal Server Error");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server started on port: ${PORT}`);
  eventController.on("data", EventQueue.onEventTriggered);
});