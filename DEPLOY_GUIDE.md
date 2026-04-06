# 🚀 BIA — Guia de Deploy Vercel

## OPÇÃO A: Deploy via Vercel CLI (sem GitHub) — RECOMENDADO AGORA

### 1. Crie conta no Vercel (se não tiver)
→ https://vercel.com/signup

### 2. Gere um token Vercel
→ https://vercel.com/account/tokens
→ Clique em "Create Token"
→ Nome: "BIA Deploy"
→ Escopo: Full Account
→ Copie o token gerado

### 3. Configure banco de dados Neon (PostgreSQL grátis)
→ https://neon.tech → "New Project" → "bia-database"
→ Selecione região: São Paulo (sa-east-1) ou US East
→ Copie a DATABASE_URL no formato:
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

### 4. Gere a chave Google AI (Gemini)
→ https://aistudio.google.com/app/apikey
→ "Create API Key"
→ Copie a chave

### 5. NEXTAUTH_SECRET já gerado:
g9fjNW5VpmtEgR0vqbPMSVTCXaIN2rM79I6hS7+irrk=

---

## OPÇÃO B: Deploy via GitHub + Vercel (integração automática)

### 1. Autorize GitHub no painel lateral
→ Vá na aba "#github" no sandbox
→ Complete a autorização OAuth

### 2. Importe no Vercel
→ https://vercel.com/new
→ "Import Git Repository"
→ Selecione o repo "bia" ou "webapp"

---

## Variáveis de Ambiente (configurar no Vercel Dashboard)

```
DATABASE_URL=postgresql://USER:PASS@HOST/DB?sslmode=require
NEXTAUTH_SECRET=g9fjNW5VpmtEgR0vqbPMSVTCXaIN2rM79I6hS7+irrk=
NEXTAUTH_URL=https://SEU-PROJETO.vercel.app
GOOGLE_AI_API_KEY=sua-chave-gemini-aqui
```

## Após o deploy:
```bash
# Rodar migrations no banco de produção
npx prisma migrate deploy
# ou pelo Vercel → Project Settings → Functions → Environment
```
