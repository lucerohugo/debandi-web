/** @type {import('next').NextConfig} */
const nextConfig = {
  // Solo aplica en `next dev`: permite acceder desde Radmin VPN
  allowedDevOrigins: ['26.89.68.236'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
