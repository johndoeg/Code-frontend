import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const BACKEND = "http://localhost:5000";

const target = {
    target: BACKEND,
    changeOrigin: true,
    secure: false,
};

const apiProxy = {
    "/api": target,
    "/v1": target,
    "/CAM": target,
    "/Prechecking": target,
};

export default defineConfig({
    plugins: [react()],

    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },

    build: {
        chunkSizeWarningLimit: 1600,
    },

    server: {
        host: "0.0.0.0",
        port: 5173,
        proxy: apiProxy,
    },

    preview: {
        host: "0.0.0.0",
        port: 4173,
        proxy: apiProxy,
    },
});