/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite compilar en otra carpeta (NEXT_DIST_DIR=.next-build pnpm build)
  // sin pisar la de un `pnpm dev` que esté en marcha
  distDir: process.env.NEXT_DIST_DIR || ".next",
  webpack: (config) => {
    // pdf.js intenta cargar "canvas" solo cuando se ejecuta en Node;
    // en el navegador no hace falta.
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
