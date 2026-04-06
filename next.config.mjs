/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pacotes que devem rodar no servidor (não no edge)
  serverExternalPackages: ["@prisma/client", "bcryptjs"],

  images: {
    domains: ["avatars.githubusercontent.com", "lh3.googleusercontent.com"],
    remotePatterns: [
      { protocol: "https", hostname: "**.githubusercontent.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
    ],
  },

  // Cabeçalhos CORS para as rotas de API
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin",      value: "*" },
          { key: "Access-Control-Allow-Methods",     value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
          },
        ],
      },
    ]
  },
}

export default nextConfig
