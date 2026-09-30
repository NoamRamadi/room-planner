import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths, so the built `dist/` folder works from any host or sub-folder.
  base: './',
  server: { port: Number(process.env.PORT) || 5173 },
  // three.js alone is ~550 kB minified; one bundle is fine for this app.
  build: { chunkSizeWarningLimit: 800 },
});
