# Plano de acompanhamento de conversões · Campanha BIA Academy Online · nov/2026

## Funil e como cada etapa é medida

| Etapa | Sinal | Onde fica | Como medir |
|---|---|---|---|
| Entregue / aberto | Evento do provedor (Resend) | Painel Resend → `tags: campaign=academy_nov26` | Taxa de entrega; abertura é indicativa (Apple MPP infla) |
| Clique na landing | UTM `utm_source=email&utm_medium=convite&utm_campaign=academy_nov26` | `/api/academy/analytics` (evento `landing_view` já existente) + Resend click tracking | Cliques únicos por contato |
| Download do e-book | UTM no link do PDF | Resend click tracking (link rastreado) | Interesse técnico; alimenta lista de nutrição |
| **Resposta (lead quente)** | E-mail para `suporte@quantis.bio` com assunto "Interesse na BIA Academy Online — Convite Quantis" | Caixa `suporte@` | Registrar na planilha `conversoes.csv` em até 1 dia útil, com timestamp (define a ordem dos 5 primeiros) |
| Elegibilidade confirmada | Resposta da equipe | `conversoes.csv` → coluna `elegivel_desconto` / `elegivel_kit` | Só após confirmação por e-mail; ordem por timestamp da resposta |
| Matrícula | `AcademyEnrollment` criada (Asaas ou manual) | Banco (Prisma) | Cruzar e-mail do lead ↔ `user.email`; marcar `matriculado_em` |
| Uso da oferta | Desconto aplicado na cobrança; kit enviado | Asaas (valor) + `conversoes.csv` → `kit_enviado_em`, `rastreio` | Fecha o ciclo da promoção |
| Início em 2027 | Flag na planilha | `conversoes.csv` → `inicio_previsto=2027` | Lembrete em dez/2026 e jan/2027 |

## Planilha `conversoes.csv` (criar em `marketing/campanha-academy-2026-11/`)

`email, nome, instituicao, respondeu_em, modalidade (individual|3-logins), inicio_previsto (2026|2027), elegivel_desconto (s/n), elegivel_kit (s/n), matriculado_em, valor_pago, kit_enviado_em, rastreio, observacoes`

## Metas de referência (base de 64 contatos qualificados que já clicaram em campanha anterior)

- Entrega ≥ 97 % · Clique único ≥ 12 % (8 contatos) · Respostas ≥ 6 % (4 contatos) · Matrículas: 3–5 (preenche a cota promocional).

## Cadência

- **D0** — envio principal (terça ou quarta, 9h–11h BRT).
- **D+1 a D+3** — responder cada lead em até 1 dia útil, com confirmação explícita da posição (1º–5º) e das condições.
- **D+7** — follow-up resumido só para não-respondentes/não-clicantes.
- **D+14** — fechamento interno: relatório com funil, leads quentes pendentes e lista para nutrição (quem baixou o e-book sem responder).

## Higiene da base

- Qualquer resposta "não desejo receber" ou clique em descadastro → adicionar à lista de supressão `supressao.csv` antes do follow-up.
- Não reenviar o principal a quem já recebeu; não enviar follow-up a quem respondeu.
