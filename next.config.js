/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  serverExternalPackages: ['pdf-parse'],
}

module.exports = nextConfig
