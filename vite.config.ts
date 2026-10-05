import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(
    { 
        plugins: [react(), tailwindcss(),],
        server: {
            allowedHosts: [
            'jaunt-paradox-obsessive.ngrok-free.dev'
        ]
        } 
    }
);
