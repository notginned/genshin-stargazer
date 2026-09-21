import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import commonjs from 'vite-plugin-commonjs';

export default defineConfig({
  plugins: [react(), commonjs()],
  optimizeDeps: {
  },
});
