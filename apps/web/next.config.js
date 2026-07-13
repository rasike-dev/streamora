const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    // Next.js will automatically load .env.local from root
    // But we can also explicitly load from root .env
  },
}

module.exports = withNextIntl(nextConfig);
