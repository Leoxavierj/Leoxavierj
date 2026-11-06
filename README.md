# Aniversário de 5 anos do Théo — confirmação de presença

Next.js (App Router) + Upstash Redis + Resend, publicado no Vercel.

- `/` — página pública com convite e formulário de presença
- `/lista` — área privada (Leonardo e Flávia) com resumo, lista, cadastro manual e exportação CSV
- `/convite.ics` — evento para adicionar ao calendário

## Imagens

- `public/convite.jpg` — convite inteiro (topo da página, 914×1600; o Next.js entrega em WebP/AVIF no tamanho da tela)
- `public/og-image.jpg` — prévia do WhatsApp, 1200×630

## Variáveis de ambiente

| Variável | Obrigatória | Valor |
|---|---|---|
| `KV_REST_API_URL` | sim | Criada automaticamente pela integração Upstash do Vercel |
| `KV_REST_API_TOKEN` | sim | Criada automaticamente pela integração Upstash do Vercel |
| `LOGIN_LEONARDO` | sim | `leonardo:senha-do-leonardo` |
| `LOGIN_FLAVIA` | sim | `flavia:senha-da-flavia` |
| `RESEND_API_KEY` | sim (para e-mails) | Chave da API do Resend (`re_...`) |
| `NOTIFY_EMAILS` | sim (para e-mails) | `leonardo.xavierj@gmail.com,flavia.enriquez@gmail.com` |
| `EMAIL_FROM` | recomendada | Remetente de um domínio verificado no Resend, ex.: `Théo 5 anos <convite@seudominio.com.br>` |
| `ANTHROPIC_API_KEY` | opcional | Ativa o campo "Escrever livremente" no cadastro manual |
| `SITE_URL` | opcional | Só se usar domínio próprio, ex.: `https://theo5anos.com.br` |

Observações:

- O usuário do login não diferencia maiúsculas nem acentos; a senha diferencia. Trocar a senha encerra as sessões abertas daquele usuário.
- Sem `EMAIL_FROM`, o envio sai de `onboarding@resend.dev`, que **só entrega para o e-mail dono da conta Resend**. Para a Flávia também receber, verifique um domínio no Resend e defina `EMAIL_FROM`.
- Sem `SITE_URL`, o site usa o domínio de produção do Vercel (`VERCEL_PROJECT_PRODUCTION_URL`) no `og:url` e no link do e-mail.

## Publicar no Vercel

1. Em vercel.com → **Add New → Project**, importe este repositório (framework: Next.js, sem configurações extras).
2. No projeto: **Storage → Create Database → Upstash (Redis)**, conecte ao projeto em todos os ambientes. Isso cria `KV_REST_API_URL` e `KV_REST_API_TOKEN`.
3. Em **Settings → Environment Variables**, adicione as demais variáveis da tabela.
4. **Deployments → Redeploy** (as variáveis só valem a partir de um novo deploy).
5. Teste: abra o site, confirme uma presença de teste, veja se o e-mail chegou, entre em `/lista` e remova o teste.
6. Antes de mandar no WhatsApp, cole o link em https://developers.facebook.com/tools/debug/ para conferir a prévia. O WhatsApp guarda a prévia em cache: acerte a imagem antes do primeiro envio.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha as variáveis
npm run dev
```

Sem as variáveis do Upstash, em desenvolvimento o app usa um banco em memória (apagado ao reiniciar).

## Dados do evento

Ficam em `lib/event.ts` (data, hora, local, endereço e duração no calendário: 15h às 18h).
