/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '805342.fs1.hubspotusercontent-na1.net',
      },
      {
        protocol: 'https',
        hostname: 'www.thd.tn',
      },
    ],
  },
}

module.exports = nextConfig

