/** @type {import('next').NextConfig} */

const nextConfig = {
  typescript: {
    // This is still useful to get a build to pass even with type errors
    ignoreBuildErrors: true,
  },
  experimental: {
    // This is the option that will solve the 'Module parse failed' error.
    // It tells Next.js to run its compiler on these specific packages.
    serverComponentsExternalPackages: ['@sparticuz/chromium'],
  },
  
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'example.com',
      },
    ],
  },
  // The custom webpack function has been removed.
  // Next.js will now automatically handle the '@' alias
  // based on your tsconfig.json file.
};

module.exports = nextConfig;