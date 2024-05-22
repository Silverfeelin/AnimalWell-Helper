const http = require("http");
const fs = require("fs");

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST",
  "Access-Control-Allow-Headers": "*",
  "Content-Type": "application/json",
};

const server = http.createServer((req, res) => {
  res.writeHead(200, headers);
  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString(); // convert Buffer to string
    });
    req.on("end", () => {
      saveNodeArray(body);
      res.end("POST request received");
    });
  } else {
    res.end("Invalid request");
  }
});

server.listen(4300, () => {
  console.log("Server is running on port 4300");
});

function saveNodeArray(jsonArray) {
  const array = JSON.parse(jsonArray);
  const json = JSON.stringify({ items: array });
  const filePath = __dirname + "/../src/assets/nodes.json";

  fs.writeFile(filePath, json, (err) => {
    if (err) {
      console.error("Error writing JSON to file:", err);
    } else {
      console.log("JSON written to file successfully");
    }
  });
}
