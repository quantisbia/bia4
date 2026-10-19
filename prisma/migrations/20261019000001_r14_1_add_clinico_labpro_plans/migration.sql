-- R14.1 · Opção A "Clean & Clareza" (Janaina, 2026-10-19)
-- ─────────────────────────────────────────────────────────────────────
-- Adiciona 2 novos valores ao enum SubscriptionPlan:
--
--   CLINICO  — R$ 507/mês (primeiro tier pago; perfil clínico)
--              Perfeito para médicos (ortopedia, dermato, odonto)
--              que querem usar a BIA sem precisar do laboratório
--              completo de pesquisa. Substitui o GUIDE para novas
--              assinaturas, mantendo o preço histórico de R$ 507/mês.
--
--   LAB_PRO  — R$ 2.375/ano (tier anual para labs e pesquisa)
--              Formulador Pro, Pipeline completo, Organoid Builder,
--              Protocolos GLP/GMP, Notebook versionado, etc.
--              Equivalente anual do antigo GUIDE para pesquisadores.
--
-- Assinantes atuais do GUIDE (R$ 507/mês) permanecem ativos — eles
-- continuam no plan=GUIDE até cancelarem ou migrarem voluntariamente.
-- Nenhum registro existente é alterado por esta migration.

ALTER TYPE "SubscriptionPlan" ADD VALUE 'CLINICO';
ALTER TYPE "SubscriptionPlan" ADD VALUE 'LAB_PRO';
