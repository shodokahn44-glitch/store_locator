const fs = require("fs");
const path = require("path");

const jsPath = path.join(__dirname, "build", "server.js");
const cjsPath = path.join(__dirname, "build", "server.cjs");

if (!fs.existsSync(jsPath)) {
  console.error(`Missing file: ${jsPath}`);
  process.exit(1);
}

if (fs.existsSync(cjsPath)) {
  fs.unlinkSync(cjsPath);
}

fs.renameSync(jsPath, cjsPath);
console.log("Renamed build/server.js -> build/server.cjs");