import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  if (mode === "production" && !env.BACKEND_URL?.trim()) {
    throw new Error("BACKEND_URL must be set for a production build.");
  }

  return {
    plugins: [react(), tailwindcss()],
    define: {
      "import.meta.env.BACKEND_URL": JSON.stringify(env.BACKEND_URL?.trim() || ""),
    },
  };
});
