/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow external tunnel domains and local network (for mobile HTTPS testing)
  allowedDevOrigins: ['*.loca.lt', '*.ngrok.io', '*.ngrok-free.app', '192.168.1.135', '*.trycloudflare.com'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lckwxhtdjrmzhffulwse.supabase.co' },
    ],
  },
  // Allow larger image uploads for photos
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
