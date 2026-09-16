-- R13.11 · Adiciona plano GUIDE (Guia Inteligente em Biofabricação 3D)
-- Assinatura mensal R$ 507 · 1.500 créditos renovados todo mês
-- Planos legados (ADVANCED/ENTERPRISE/DISCOVERY/ORGANOID_LAB) permanecem no enum
-- para não quebrar contratos existentes.

ALTER TYPE "SubscriptionPlan" ADD VALUE 'GUIDE';
