import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    allowedHosts: [
      "d4fc-61-246-82-102.ngrok-free.app"
    ]
  },
});
