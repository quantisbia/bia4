/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 14: pacotes que devem rodar só no servidor (não no Edge runtime)
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
    // Sandbox com RAM limitada (~1GB): desliga workers paralelos do webpack/build
    workerThreads: false,
    cpus: 1,
  },

  // Build em sandbox com RAM limitada (~1GB): pulamos lint/typecheck no build
  // pois já validamos separadamente com `npx tsc --noEmit` antes de cada commit.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  images: {
    domains: ["avatars.githubusercontent.com", "lh3.googleusercontent.com"],
    remotePatterns: [
      { protocol: "https", hostname: "**.githubusercontent.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
    ],
  },

  // CORS apenas para rotas de API públicas — NÃO incluir /api/auth/*
  // Access-Control-Allow-Origin: * é INCOMPATÍVEL com credentials:true do NextAuth
  async headers() {
    return [
      {
        source: "/api/((?!auth).*)",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "X-Requested-With, Accept, Accept-Version, Content-Length, Content-Type, Date, Authorization",
          },
        ],
      },
    ]
  },
}

export default nextConfig
