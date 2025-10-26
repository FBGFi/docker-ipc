const net = require("node:net");
const fs = require("fs");
const { exec } = require("child_process");
const { randomUUID } = require("node:crypto");
const eventControllerSocketPath = "/tmp/eventController";
const proxySocketPath = "/tmp/proxy";
const requests = new Map();
const clients = new Map();

if (fs.existsSync(eventControllerSocketPath)) {
  fs.unlinkSync(eventControllerSocketPath)
}

if (fs.existsSync(proxySocketPath)) {
  fs.unlinkSync(proxySocketPath)
}

const eventController = net.createServer((socket) => {
  socket.on("data", (buffer) => {
    console.log("Event triggered");
    const event = JSON.parse(buffer.toString());
    if (!event.request_id) {
      console.error("Unknown event: ", event);
      return;
    }
    const client = requests.get(event.request_id);
    if (client) {
      console.log("Responding to client: ", event.request_id);
      console.log(event.data);
      client.write(JSON.stringify(event));
    } else {
      console.error("Client not found: ", event);
    }
  })
});

eventController.listen(eventControllerSocketPath, () => {
  console.log("Listening on events");
});

eventController.on("connection", (socket) => {
  // Too lazy to fix, we get fatal exception since argparse triggers this also
  if (clients.size) {
    return;
  }
  const clientId = randomUUID();
  console.log("Registered client with id: ", clientId);
  clients.set(clientId, socket);

  try {
    socket.write(JSON.stringify({ client_id: clientId }));
  } catch (error) {
    console.error("Likely tried to respond to closed process.");
    clients.delete(clientId);
    return;
  }

  socket.on("close", () => {
    console.log("Client disconnected: ", clientId);
    clients.delete(clientId);
  });
});

const proxy = net.createServer((socket) => {
  socket.on("data", (buffer) => {
    const request = JSON.parse(buffer.toString());
    const clientId = request.client_id;
    const client = clients.get(clientId);
    if (!client) {
      console.error("Unregisted client: ", clientId);
      return;
    }
    const requestId = request.request_id;
    if (!requestId) {
      console.error("Missing id for request");
      return;
    }
    console.log("Proxy received a request: ", requestId);
    requests.set(requestId, client);
    const args = Object.entries(request.data).map(([key, value]) => `--${key}='${value}'`).join(" ");
    exec(`/shared/bin/processes/argparse -- --request_id='${requestId}' ${args}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
      } else if (stderr) {
        console.error(`error: `, stderr);
      } else if (stdout) {
        console.log(stdout);
      }
    });
  });
});

proxy.listen(proxySocketPath, () => {
  console.log("Proxy listening");
});

proxy.on("connection", () => {
  console.log("Client connected to proxy");
});
