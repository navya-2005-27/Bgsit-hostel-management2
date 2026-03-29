import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname, "client"),
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: [
        ".",                // Allow the root (client folder)
        "../shared"         // Allow shared folder one level up
      ],
      deny: [
        "../.env",
        "../.env.*",
        "../*.{crt,pem}",
        "../**/.git/**",
        "../server/**",
      ],
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  build: {
    outDir: "../dist/spa",
  },
});
