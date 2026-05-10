import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const viteBin = path.join(__dirname, "node_modules", "vite", "bin", "vite.js");

function start(command, args, name, envOverrides = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      ...envOverrides,
    },
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
      process.exitCode = code;
      process.kill(process.pid, "SIGTERM");
    }
  });

  return child;
}

const client = start(process.execPath, [viteBin, "--host", "::", "--port", "8080"], "vite");
const server = start(
  process.execPath,
  ["--import", "tsx", "server/dev.ts"],
  "server",
  { TSX_DISABLE_CACHE: "1" },
);

function shutdown(signal) {
  client.kill(signal);
  server.kill(signal);
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));