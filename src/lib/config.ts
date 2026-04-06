// Environment variables validation
export const env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL!,
  
  // Auth
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
  
  // Google AI
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY!,
  
  // App
  NODE_ENV: process.env.NODE_ENV || "development",
  APP_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
}

export const siteConfig = {
  name: "BIA v3",
  description: "Plataforma de IA para Biofabricação",
  url: env.APP_URL,
  version: "3.0.0",
  
  // Feature flags
  features: {
    organoids: true,
    rag: true,
    protocols: true,
    analytics: true,
  },
}
