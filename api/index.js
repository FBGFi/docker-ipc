const http = require("http");
const url = require("url");
const PORT = process.env.PORT;

const server = http.createServer(async (req, res) => {
  const method = req.method;
  const parsedUrl = url.parse(req.url, true);
  console.log("Data requested");
  if (method !== "GET" || parsedUrl.pathname !== "/") {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(parsedUrl.query));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server started on port: ${PORT}`);
});