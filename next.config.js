/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
  }
}

module.exports = nextConfig