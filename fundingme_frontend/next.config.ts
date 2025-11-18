import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    }
    return config
  },
  turbopack: {
    resolveAlias: {
      canvas: './empty-module.js',
    },
  },
}

export default nextConfig
