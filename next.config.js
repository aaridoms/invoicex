/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // pdf.js intenta cargar "canvas" solo cuando se ejecuta en Node;
    // en el navegador no hace falta.
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
