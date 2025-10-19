const net = require("node:net");
const fs = require("fs");
const { exec } = require("child_process");
const eventControllerSocketPath = "/tmp/eventController";
const proxySocketPath = "/tmp/proxy";
const clients = new Map();

if (fs.existsSync(eventControllerSocketPath)) {
  fs.unlinkSync(eventControllerSocketPath)
}

if (fs.existsSync(proxySocketPath)) {
  fs.unlinkSync(proxySocketPath)
}

const eventController = net.createServer();

eventController.listen(eventControllerSocketPath, () => {
  console.log("Listening on events");
});

eventController.on("connection", (socket) => {
  console.log("Connection acquired for event controller");
  clients.set("TEMP_ID", socket);
});

eventController.on("request", (data) => {
  console.log("Event triggered");
  console.log(data);
  const client = clients.get("TEMP_ID");
  if (client) {
    client.write(JSON.stringify(data));
  } else {
    console.log("Client not found");
  }
})

const proxy = net.createServer((socket) => {
  socket.on("data", (buffer) => {
    console.log("Proxy received a request");
    const data = JSON.parse(buffer.toString());
    eventController.emit("request", data);
    const args = Object.entries(data).map(([key, value]) => `--${key}=${value}`).join(" ");
    exec(`/shared/bin/processes/argparse -- ${args}`, (error) => {
      if (error) {
        console.error(`exec error: ${error}`);
      }
    });
  });
});

proxy.listen(proxySocketPath, () => {
  console.log("Proxy listening");
});

proxy.on("connection", (socket) => {
  console.log("Connection acquired for proxy");
});
