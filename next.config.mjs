/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3'],
  outputFileTracingIncludes: {
    '/api': ['./node_modules/better-sqlite3/**/*'],
  },
};

export default nextConfig;
