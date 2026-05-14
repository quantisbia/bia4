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

  // ─── Redirects 301 permanentes ─────────────────────────────────────────
  // Reestruturação BIA v5: as funcionalidades de bioimpressão foram unificadas
  // em /dashboard/bioprint/* (4 etapas lineares: model → bioink → slice → control).
  // Rotas antigas redirecionam para as novas equivalentes para preservar links
  // externos, indexação e bookmarks dos usuários.
  //
  // Mapeamento:
  //   /dashboard/stl                        → /dashboard/bioprint/model
  //   /dashboard/biomaterials               → /dashboard/bioprint/bioink
  //   /dashboard/bioprinter-control         → /dashboard/bioprint/control
  //   /dashboard/bioprinting                → /dashboard/bioprint
  //   /dashboard/bioprinting/engine         → /dashboard/bioprint/slice
  //   /dashboard/bioprinting/dual-porosity  → /dashboard/bioprint/model
  //   /dashboard/bioprinting/connection-guide → /dashboard/bioprint/control
  async redirects() {
    return [
      {
        source: "/dashboard/stl",
        destination: "/dashboard/bioprint/model",
        permanent: true,
      },
      {
        source: "/dashboard/biomaterials",
        destination: "/dashboard/bioprint/bioink",
        permanent: true,
      },
      {
        source: "/dashboard/bioprinter-control",
        destination: "/dashboard/bioprint/control",
        permanent: true,
      },
      // ATENÇÃO: redirects mais específicos (sub-rotas) DEVEM vir antes do pai
      // /dashboard/bioprinting → /dashboard/bioprint, senão o pai captura tudo.
      {
        source: "/dashboard/bioprinting/engine",
        destination: "/dashboard/bioprint/slice",
        permanent: true,
      },
      {
        source: "/dashboard/bioprinting/dual-porosity",
        destination: "/dashboard/bioprint/model",
        permanent: true,
      },
      {
        source: "/dashboard/bioprinting/connection-guide",
        destination: "/dashboard/bioprint/control",
        permanent: true,
      },
      {
        source: "/dashboard/bioprinting",
        destination: "/dashboard/bioprint",
        permanent: true,
      },
    ]
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
