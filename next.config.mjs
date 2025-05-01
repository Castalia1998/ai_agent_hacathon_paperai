/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/monaco-editor/:path*',
        destination: '/_next/static/monaco-editor/:path*',
      },
      {
        source: '/monaco-editor-workers/:path*',
        destination: '/_next/static/monaco-editor-workers/:path*',
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Add Monaco Editor webpack plugin
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'monaco-editor': 'monaco-editor/esm/vs/editor/editor.api',
      };
    }
    return config;
  },
}

export default nextConfig
