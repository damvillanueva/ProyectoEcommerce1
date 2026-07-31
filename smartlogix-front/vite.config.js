import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Three.js queda aislado y solo se descarga al abrir la vista 3D.
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vendor-react",
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: "vendor-three",
              test: /node_modules[\\/]three[\\/]/,
              priority: 25,
            },
            {
              name: "vendor-maps",
              test: /node_modules[\\/](leaflet|react-leaflet|@react-leaflet)[\\/]/,
              priority: 20,
            },
            {
              name: "vendor-qr",
              test: /node_modules[\\/]qrcode[\\/]/,
              priority: 15,
            },
          ],
        },
      },
    },
  },
});
