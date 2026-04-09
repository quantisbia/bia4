# ✅ Checklist de Deploy - BIA v4

## Pré-Deploy

### 1. Código e Dependências
- [ ] Todos os commits feitos (`git status` limpo)
- [ ] Build local bem-sucedido (`npm run build`)
- [ ] Sem erros de lint (`npm run lint`)
- [ ] Dependências atualizadas (`npm audit`)
- [ ] `.gitignore` configurado (não commitar `.env.local`)

### 2. Banco de Dados
- [ ] Migrations criadas e testadas
- [ ] Seed data funcional (se aplicável)
- [ ] DATABASE_URL de produção configurada no Vercel
- [ ] Conexão testada localmente com URL de produção
- [ ] Backup do banco feito (Neon tem backups automáticos)

### 3. Variáveis de Ambiente
- [ ] `DATABASE_URL` configurada no Vercel
- [ ] `NEXTAUTH_SECRET` configurada no Vercel
- [ ] `NEXTAUTH_URL` configurada (URL de produção)
- [ ] `GOOGLE_AI_API_KEY` configurada no Vercel
- [ ] Outras variáveis específicas adicionadas

### 4. Autenticação
- [ ] OAuth callbacks atualizados (se usar Google/GitHub OAuth)
- [ ] NEXTAUTH_URL aponta para domínio de produção
- [ ] Redirect URIs configurados no provider OAuth
- [ ] Cookies configurados corretamente (secure: true em produção)

### 5. Arquivos Estáticos
- [ ] Todos os arquivos estão em `public/`
- [ ] Imagens otimizadas (tamanho reduzido)
- [ ] Favicons presentes
- [ ] Manifest.json configurado (se PWA)

## Deploy

### Opção A: Via CLI

```bash
# 1. Login (primeira vez)
vercel login

# 2. Deploy preview
npm run deploy:preview

# 3. Testar preview URL

# 4. Deploy produção
npm run deploy:prod
```

### Opção B: Via Script

```bash
./deploy-vercel.sh
```

### Opção C: Via GitHub (Auto-deploy)

```bash
git push origin main
# Vercel faz deploy automático
```

## Pós-Deploy

### 1. Verificações Técnicas
- [ ] Site carrega (`https://bia-platform.vercel.app`)
- [ ] Login funciona
- [ ] Dashboard acessível
- [ ] API routes respondem (`/api/health`, `/api/knowledge`)
- [ ] Base de dados conecta
- [ ] Sessões persistem
- [ ] Sem erros no console do navegador

### 2. Funcionalidades Principais
- [ ] **Pipeline** funciona
- [ ] **Formulador Bio** funciona
- [ ] **Bioimpressão 3D** funciona
- [ ] **Organoid Builder** funciona e gera protocolos
- [ ] **Protocolos GLP/GMP** funciona
- [ ] **Análises & Dossiês** funciona
- [ ] **Base de Conhecimento** carrega dados
- [ ] **Chat IA** responde
- [ ] **STL/OBJ Generator** funciona
- [ ] **Protocolo Total** funciona
- [ ] **Notebook Científico** funciona

### 3. Funcionalidades Admin
- [ ] Login como admin (`janaina.dernowsek@quantis.bio`)
- [ ] Dashboard admin acessível (`/dashboard/admin`)
- [ ] Lista de usuários carrega
- [ ] Update de créditos funciona
- [ ] Update de plano funciona
- [ ] Filtros e busca funcionam

### 4. Performance
- [ ] Lighthouse Score > 80
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 3s
- [ ] Sem memory leaks
- [ ] API responses < 500ms

### 5. Segurança
- [ ] HTTPS habilitado (Vercel faz automático)
- [ ] Headers de segurança configurados
- [ ] Rate limiting em APIs críticas
- [ ] Variáveis sensíveis não expostas no client
- [ ] CSP configurado (se aplicável)

### 6. Monitoramento
- [ ] Vercel Analytics ativo
- [ ] Logs funcionando (`vercel logs`)
- [ ] Alertas configurados (opcional)
- [ ] Error tracking configurado (opcional: Sentry)

### 7. Documentação
- [ ] README atualizado com URL de produção
- [ ] CHANGELOG atualizado
- [ ] API docs atualizadas (se aplicável)
- [ ] Manual do usuário atualizado

## Rollback (Se Necessário)

### Via CLI
```bash
vercel rollback
```

### Via Dashboard
1. Acesse https://vercel.com/dashboard
2. Vá em **Deployments**
3. Selecione deployment anterior
4. Clique em **Promote to Production**

## Domínio Customizado (Opcional)

### Adicionar Domínio
- [ ] Domínio adicionado no Vercel
- [ ] DNS configurado (CNAME para `cname.vercel-dns.com`)
- [ ] SSL certificado emitido (automático)
- [ ] `NEXTAUTH_URL` atualizada com novo domínio
- [ ] OAuth callbacks atualizados

### Configuração DNS
```
Type: CNAME
Name: bia (ou @)
Value: cname.vercel-dns.com
```

## Comunicação

### Equipe
- [ ] Equipe notificada sobre novo deploy
- [ ] Changelog compartilhado
- [ ] Novos features documentados
- [ ] Breaking changes comunicados

### Usuários
- [ ] Usuários beta notificados (se aplicável)
- [ ] Documentação de usuário atualizada
- [ ] Suporte preparado para possíveis dúvidas

## Comandos Úteis

```bash
# Ver status
npm run vercel:status

# Ver logs em tempo real
npm run vercel:logs

# Baixar variáveis de ambiente
npm run vercel:env

# Deploy preview
npm run deploy:preview

# Deploy produção
npm run deploy:prod

# Rollback
vercel rollback

# Ver detalhes do projeto
vercel inspect
```

## Troubleshooting Comum

### Build falha
1. Teste build local: `npm run build`
2. Verifique logs no Vercel
3. Confirme todas as dependências em `package.json`
4. Verifique se Prisma generate está no build command

### Database connection error
1. Verifique `DATABASE_URL` no Vercel
2. Teste conexão local com URL de produção
3. Confirme SSL mode: `?sslmode=require`
4. Verifique se IP do Vercel está permitido (Neon permite todos)

### NextAuth error
1. Verifique `NEXTAUTH_SECRET` e `NEXTAUTH_URL`
2. Confirme OAuth callbacks
3. Verifique cookies (secure: true em prod)
4. Teste com session em modo debug

### 404 em páginas
1. Verifique se rotas estão em `src/app/`
2. Confirme estrutura de diretórios
3. Verifique `next.config.mjs`
4. Limpe cache do Vercel e redeploy

### Função timeout
1. Funções Vercel têm limite de 10s (Hobby) ou 60s (Pro)
2. Otimize queries lentas
3. Use Edge Functions para operações rápidas
4. Considere background jobs para tarefas longas

## URLs Importantes

- **Produção**: https://bia-platform.vercel.app
- **Dashboard Vercel**: https://vercel.com/dashboard
- **Neon Database**: https://console.neon.tech
- **Google AI Studio**: https://aistudio.google.com
- **GitHub Repo**: (configure aqui)

## Contatos de Emergência

- **Admin**: janaina.dernowsek@quantis.bio
- **Dev Team**: (configure aqui)
- **Suporte Vercel**: https://vercel.com/support

---

**Última revisão**: 2026-04-08  
**Versão**: 1.0  
**Deploy atual**: (atualizar após deploy)
