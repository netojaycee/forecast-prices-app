/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Enable static export
  basePath: '', // No base path since FastAPI serves at root
  trailingSlash: true, // Ensure trailing slashes for static files
  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/:path*',
  //       destination: '/api/:path*', // API calls go to FastAPI
  //     },
  //   ];
  // },
};

export default nextConfig;