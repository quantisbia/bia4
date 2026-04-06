#!/bin/bash
# ============================================
# BIA v3 - Script de Setup do Banco de Dados
# Execute após configurar DATABASE_URL no .env.local
# ============================================

echo "🗄️  BIA v3 - Database Setup"
echo "================================"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL não configurado!"
    echo ""
    echo "📋 Passos para configurar:"
    echo "1. Acesse https://neon.tech e crie um projeto gratuito"
    echo "2. Copie a connection string do formato:"
    echo "   postgresql://user:password@host.neon.tech/dbname?sslmode=require"
    echo "3. Adicione ao arquivo .env.local:"
    echo "   DATABASE_URL=\"sua-connection-string\""
    echo "   DIRECT_URL=\"sua-connection-string\""
    echo ""
    exit 1
fi

echo "✅ DATABASE_URL configurado"
echo ""

# Run migrations
echo "📦 Aplicando migrations..."
npx prisma migrate deploy
if [ $? -ne 0 ]; then
    echo "⚠️  Falha nas migrations. Tentando db push..."
    npx prisma db push
fi

echo ""
echo "🌱 Rodando seed..."
npx prisma db seed

echo ""
echo "✅ Database configurado com sucesso!"
echo ""
echo "🎉 Credenciais demo:"
echo "   Email: demo@bia.com"
echo "   Senha: demo1234"
