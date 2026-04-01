/** @type {import('next').NextConfig} */
const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

const nextConfig = {
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backendUrl}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
