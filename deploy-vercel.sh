#!/bin/bash

# ============================================
# BIA v4 - Deploy Script para Vercel
# ============================================

set -e

echo "🚀 BIA v4 - Deploy para Vercel"
echo "================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# Verificar se Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI não encontrado. Instalando...${NC}"
    npm install -g vercel
    echo -e "${GREEN}✅ Vercel CLI instalado${NC}"
fi

# Verificar autenticação
echo -e "${BLUE}🔐 Verificando autenticação Vercel...${NC}"
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Você não está autenticado no Vercel${NC}"
    echo -e "${BLUE}Por favor, faça login:${NC}"
    vercel login
fi

echo -e "${GREEN}✅ Autenticado como: $(vercel whoami)${NC}"
echo ""

# Verificar build local
echo -e "${BLUE}🔨 Testando build local...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ Build local bem-sucedido${NC}"
else
    echo -e "${RED}❌ Erro no build local. Corrija os erros antes de fazer deploy.${NC}"
    exit 1
fi
echo ""

# Perguntar tipo de deploy
echo -e "${YELLOW}Escolha o tipo de deploy:${NC}"
echo "1) Preview (ambiente de teste)"
echo "2) Production (ambiente de produção)"
read -p "Opção [1]: " deploy_type
deploy_type=${deploy_type:-1}

# Confirmar variáveis de ambiente
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Variáveis de ambiente necessárias no Vercel:${NC}"
echo "  • DATABASE_URL"
echo "  • NEXTAUTH_SECRET"
echo "  • NEXTAUTH_URL"
echo "  • GOOGLE_AI_API_KEY"
echo ""
read -p "As variáveis estão configuradas no Vercel? (s/N): " vars_ok
vars_ok=${vars_ok:-n}

if [[ ! "$vars_ok" =~ ^[Ss]$ ]]; then
    echo ""
    echo -e "${YELLOW}Configure as variáveis primeiro:${NC}"
    echo "  vercel env add DATABASE_URL production"
    echo "  vercel env add NEXTAUTH_SECRET production"
    echo "  vercel env add NEXTAUTH_URL production"
    echo "  vercel env add GOOGLE_AI_API_KEY production"
    echo ""
    echo -e "Ou no dashboard: ${BLUE}https://vercel.com/dashboard${NC}"
    exit 1
fi

# Fazer deploy
echo ""
if [ "$deploy_type" == "2" ]; then
    echo -e "${BLUE}🚀 Fazendo deploy para PRODUCTION...${NC}"
    vercel --prod
    echo ""
    echo -e "${GREEN}✅ Deploy de produção concluído!${NC}"
    echo -e "${BLUE}🌐 URL: https://bia-platform.vercel.app${NC}"
else
    echo -e "${BLUE}🚀 Fazendo deploy para PREVIEW...${NC}"
    vercel
    echo ""
    echo -e "${GREEN}✅ Deploy de preview concluído!${NC}"
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Deploy finalizado com sucesso!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Mostrar próximos passos
echo -e "${YELLOW}📋 Próximos passos:${NC}"
echo "  1. Teste a aplicação na URL fornecida"
echo "  2. Verifique os logs: vercel logs"
echo "  3. Configure domínio customizado (se necessário)"
echo "  4. Atualize NEXTAUTH_URL se mudou o domínio"
echo ""
