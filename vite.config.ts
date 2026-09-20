import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: [ "@paddleocr/paddleocr-js" ],
    include: [ "clipper-lib" ],
  }
})
