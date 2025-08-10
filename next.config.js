/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.clerk.dev'],
  },
  // Disable experimental features that might cause issues
  experimental: {
    esmExternals: false,
  },
  // Optimize webpack for better performance
  webpack: (config, { dev }) => {
    // Disable all caching to avoid Windows path issues
    config.cache = false;
    
    // Handle Windows path issues
    config.resolve.symlinks = false;
    
    // Disable file watching that might cause issues
    config.watchOptions = {
      poll: false,
      ignored: /node_modules/,
    };
    
    // Handle Node.js polyfills
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      encoding: false,
      undici: false,
    };

    return config;
  },
}

module.exports = nextConfig
