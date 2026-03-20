/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiUrl = process.env.INTERNAL_API_URL || 'http://localhost:7767';
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${apiUrl}/:path*`,
      },
      {
        source: '/.well-known/:path*',
        destination: `${apiUrl}/.well-known/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
