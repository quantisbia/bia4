# 🚀 Deploy BIA v4 no Vercel

## Pré-requisitos

✅ Projeto já está configurado para Vercel  
✅ Build testado e funcionando  
✅ Configuração existente em `.vercel/project.json`

## Opção 1: Deploy via CLI (Recomendado)

### 1. Instalar Vercel CLI (se necessário)

```bash
npm install -g vercel
```

### 2. Login no Vercel

```bash
vercel login
```

Você receberá um email para confirmar o login.

### 3. Deploy para Production

```bash
cd /home/user/webapp
vercel --prod
```

O Vercel CLI vai:
- ✅ Detectar que é um projeto Next.js
- ✅ Usar a configuração de `vercel.json`
- ✅ Executar `npx prisma generate && next build`
- ✅ Fazer deploy para produção

### 4. Configurar Variáveis de Ambiente

Você precisa adicionar as seguintes variáveis no dashboard do Vercel:

```bash
# Opção A: Via CLI
vercel env add DATABASE_URL production
# Cole o valor: postgresql://neondb_owner:npg_CkdHv2P0uJTA@ep-sparkling-butterfly-ackbfpm8.sa-east-1.aws.neon.tech/neondb?sslmode=require

vercel env add NEXTAUTH_SECRET production
# Cole o valor: g9fjNW5VpmtEgR0vqbPMSVTCXaIN2rM79I6hS7+irrk=

vercel env add NEXTAUTH_URL production
# Cole o valor: https://bia-platform.vercel.app (ou seu domínio custom)

vercel env add GOOGLE_AI_API_KEY production
# Cole o valor: AIzaSyA5KRSO_qEd4U5fWD5prKiqjN6aws-Lk68
```

**Opção B: Via Dashboard Vercel**

1. Acesse https://vercel.com/dashboard
2. Selecione o projeto `bia-platform`
3. Vá em **Settings > Environment Variables**
4. Adicione cada variável listada acima

## Opção 2: Deploy via GitHub + Vercel Dashboard

### 1. Push para GitHub

```bash
cd /home/user/webapp
git push origin main
```

### 2. Conectar Repositório no Vercel

1. Acesse https://vercel.com/dashboard
2. Clique em **Add New > Project**
3. Selecione o repositório GitHub do BIA
4. Configure as variáveis de ambiente (veja acima)
5. Clique em **Deploy**

O Vercel vai automaticamente:
- ✅ Detectar Next.js
- ✅ Configurar build commands
- ✅ Fazer deploy
- ✅ Configurar auto-deploy em novos commits

## Configuração Atual

### vercel.json
```json
{
  "buildCommand": "npx prisma generate && next build",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": ".next",
  "regions": ["gru1"]
}
```

### Projeto Existente
- **Project ID**: `prj_FK55deBRjO6PVKw22PnRKabzrkBo`
- **Org ID**: `team_7NzD30LQLoF27CZbsXILCR9m`
- **Nome**: `bia-platform`
- **Região**: São Paulo (gru1)

## Variáveis de Ambiente Necessárias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | PostgreSQL Neon | `postgresql://user:pass@host/db?sslmode=require` |
| `NEXTAUTH_SECRET` | Secret para NextAuth | String aleatória segura |
| `NEXTAUTH_URL` | URL pública do app | `https://bia-platform.vercel.app` |
| `GOOGLE_AI_API_KEY` | API Key do Gemini | `AIzaSy...` |

⚠️ **IMPORTANTE**: Após configurar `NEXTAUTH_URL`, atualize também:
- Allowed callback URLs no Google OAuth (se usar)
- Configuração de CORS/Origins permitidos

## Verificação Pós-Deploy

### 1. Testar Autenticação
```bash
curl https://bia-platform.vercel.app/api/auth/session
```

### 2. Testar Database
```bash
curl https://bia-platform.vercel.app/api/health
```

### 3. Testar Knowledge Base
```bash
curl https://bia-platform.vercel.app/api/knowledge
```

### 4. Acessar Dashboard
```
https://bia-platform.vercel.app/dashboard
```

## Troubleshooting

### Erro: "Prisma Client not initialized"

**Solução**: Verifique se `npx prisma generate` está no `buildCommand`

```json
{
  "buildCommand": "npx prisma generate && next build"
}
```

### Erro: "Database connection failed"

**Solução**: 
1. Verifique se `DATABASE_URL` está configurada corretamente
2. Confirme que o IP do Vercel está permitido no Neon
3. Verifique SSL mode: `?sslmode=require`

### Erro: "NextAuth configuration error"

**Solução**:
1. Verifique se `NEXTAUTH_SECRET` está definido
2. Atualize `NEXTAUTH_URL` para a URL de produção
3. Configure callbacks permitidos no OAuth provider

### Build muito lento

**Solução**:
- Vercel já usa cache automático
- Considere usar `next.config.mjs` com `swcMinify: true`
- Verifique se há dependências desnecessárias

## Domínio Customizado (Opcional)

### Adicionar domínio próprio

1. No Vercel Dashboard, vá em **Settings > Domains**
2. Clique em **Add**
3. Digite seu domínio (ex: `bia.quantis.bio`)
4. Configure DNS conforme instruções:
   ```
   Type: CNAME
   Name: bia (ou @)
   Value: cname.vercel-dns.com
   ```

### Atualizar NEXTAUTH_URL

Após configurar domínio customizado:

```bash
vercel env add NEXTAUTH_URL production
# Novo valor: https://bia.quantis.bio
```

## Monitoramento

### Logs em Tempo Real

```bash
vercel logs bia-platform --follow
```

### Dashboard Vercel

- **Analytics**: https://vercel.com/bia-platform/analytics
- **Deployments**: https://vercel.com/bia-platform/deployments
- **Settings**: https://vercel.com/bia-platform/settings

## Deploy Automático (CI/CD)

Com GitHub conectado, cada push para `main` automaticamente:
1. ✅ Executa build
2. ✅ Roda testes (se configurados)
3. ✅ Faz deploy em preview
4. ✅ Após merge, faz deploy em produção

### Preview Deployments

Cada PR terá uma URL única de preview:
```
https://bia-platform-git-feature-branch.vercel.app
```

## Performance

### Edge Functions

Todas as API routes rodam em edge functions globalmente distribuídas.

### Regiões

Configurado para São Paulo (gru1), mas Vercel distribui automaticamente via CDN global.

### Caching

- Static pages: Cache automático
- API routes: Configure headers de cache conforme necessário
- ISR (Incremental Static Regeneration): Disponível para páginas

## Rollback

### Via CLI
```bash
vercel rollback
```

### Via Dashboard
1. Vá em **Deployments**
2. Selecione um deployment anterior
3. Clique em **Promote to Production**

## Comandos Úteis

```bash
# Deploy preview
vercel

# Deploy production
vercel --prod

# Ver logs
vercel logs

# Listar deployments
vercel ls

# Ver detalhes do projeto
vercel inspect

# Remover deployment
vercel remove [deployment-url]
```

## Próximos Passos Após Deploy

1. ✅ Testar todas as funcionalidades
2. ✅ Configurar domínio customizado (se aplicável)
3. ✅ Configurar monitoramento e alertas
4. ✅ Documentar URLs de produção
5. ✅ Atualizar README com link de produção
6. ✅ Configurar backups do banco (Neon oferece backups automáticos)

---

**Status**: Configuração pronta para deploy  
**Última atualização**: 2026-04-08  
**Projeto Vercel**: bia-platform
