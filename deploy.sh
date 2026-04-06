#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  BIA — Script de Deploy Automatizado no Vercel
#  Execute: bash deploy.sh SEU_VERCEL_TOKEN DATABASE_URL GOOGLE_AI_KEY
# ═══════════════════════════════════════════════════════════════

set -e

VERCEL_TOKEN="${1:-}"
DATABASE_URL="${2:-}"
GOOGLE_AI_API_KEY="${3:-}"
NEXTAUTH_SECRET="g9fjNW5VpmtEgR0vqbPMSVTCXaIN2rM79I6hS7+irrk="

if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ Uso: bash deploy.sh VERCEL_TOKEN DATABASE_URL GOOGLE_AI_KEY"
  echo ""
  echo "Gere seu token em: https://vercel.com/account/tokens"
  exit 1
fi

VERCEL_BIN="$HOME/.local/bin/vercel"
PROJECT_DIR="/home/user/webapp"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 BIA — Deploy Vercel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$PROJECT_DIR"

# ── 1. Deploy inicial (cria o projeto)
echo "📦 [1/4] Iniciando deploy no Vercel..."
DEPLOY_OUTPUT=$($VERCEL_BIN deploy --token="$VERCEL_TOKEN" --yes --name=bia-platform 2>&1)
PREVIEW_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[^ ]*\.vercel\.app' | head -1)
echo "✅ Preview URL: $PREVIEW_URL"

# ── 2. Configurar variáveis de ambiente
echo ""
echo "🔐 [2/4] Configurando variáveis de ambiente..."

set_env() {
  echo -n "  → $1 ... "
  echo "$2" | $VERCEL_BIN env add "$1" production --token="$VERCEL_TOKEN" --yes 2>/dev/null \
    || $VERCEL_BIN env rm "$1" production --token="$VERCEL_TOKEN" --yes 2>/dev/null \
    && echo "$2" | $VERCEL_BIN env add "$1" production --token="$VERCEL_TOKEN" --yes
  echo "✅"
}

if [ -n "$DATABASE_URL" ]; then
  set_env "DATABASE_URL" "$DATABASE_URL"
fi
set_env "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET"
if [ -n "$GOOGLE_AI_API_KEY" ]; then
  set_env "GOOGLE_AI_API_KEY" "$GOOGLE_AI_API_KEY"
fi

# ── 3. Deploy de produção (com as variáveis)
echo ""
echo "🌐 [3/4] Deploy para PRODUÇÃO..."
PROD_OUTPUT=$($VERCEL_BIN deploy --prod --token="$VERCEL_TOKEN" --yes 2>&1)
PROD_URL=$(echo "$PROD_OUTPUT" | grep -o 'https://[^ ]*\.vercel\.app' | head -1)
echo "✅ Produção: $PROD_URL"

# ── 4. Atualizar NEXTAUTH_URL
if [ -n "$PROD_URL" ]; then
  echo ""
  echo "🔗 [4/4] Atualizando NEXTAUTH_URL → $PROD_URL"
  echo "$PROD_URL" | $VERCEL_BIN env add "NEXTAUTH_URL" production --token="$VERCEL_TOKEN" --yes 2>/dev/null || true
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY CONCLUÍDO!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 URL de produção: $PROD_URL"
echo ""
echo "📋 PRÓXIMO PASSO — Rodar migrations no banco:"
echo "   DATABASE_URL=\"$DATABASE_URL\" npx prisma migrate deploy"
echo ""
echo "🔗 Dashboard Vercel: https://vercel.com/dashboard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
