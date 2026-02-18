/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Next.js will automatically load .env.local from root
    // But we can also explicitly load from root .env
  },
}

module.exports = nextConfig
