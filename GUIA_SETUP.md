# 🏃 Mover PWA — Guia de Setup

## Custo total: R$ 0 (ou ~R$50/ano se quiser domínio próprio)

---

## O que você vai precisar (instalar uma vez só)

1. **Node.js** → https://nodejs.org → versão LTS
2. **Git** → https://git-scm.com/download/win
3. Conta no **Supabase** (gratuito) → https://supabase.com
4. Conta no **Vercel** (gratuito) → https://vercel.com
5. Conta no **GitHub** (gratuito) → https://github.com

---

## Passo 1 — Banco de dados no Supabase

1. Crie conta em https://supabase.com
2. **New Project** → nome: `mover`, região: **South America (São Paulo)**
3. Aguarde ~2 min
4. Vá em **SQL Editor** → cole o conteúdo do arquivo `supabase_schema.sql` → clique **RUN**
5. Vá em **Settings → API** e copie:
   - **Project URL**
   - **anon public** key

---

## Passo 2 — Criar sua Edge Function (convite de membros)

1. No Supabase → **Edge Functions → New Function** → nome: `invite-member`
2. Cole o código do final do `supabase_schema.sql`
3. **Deploy**

---

## Passo 3 — Criar seu primeiro admin

1. Supabase → **Authentication → Users → Add User**
2. Coloque seu email e senha
3. **Table Editor → profiles** → encontre seu usuário → mude `role` para `admin`

---

## Passo 4 — Subir o projeto no GitHub

1. Abra o terminal (Prompt de Comando)
2. Entre na pasta do projeto:
   ```
   cd mover-pwa
   ```
3. Inicialize o git e suba:
   ```
   git init
   git add .
   git commit -m "Mover PWA inicial"
   ```
4. Crie um repositório no GitHub (https://github.com/new) → nome: `mover-pwa`
5. Siga as instruções que o GitHub mostra para conectar

---

## Passo 5 — Deploy no Vercel (o app fica online!)

1. Acesse https://vercel.com e faça login com sua conta GitHub
2. Clique em **Add New Project**
3. Selecione o repositório `mover-pwa`
4. Em **Environment Variables**, adicione:
   ```
   VITE_SUPABASE_URL = https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY = sua-chave-aqui
   ```
5. Clique **Deploy**
6. Em ~2 minutos seu app estará em: `https://mover-pwa.vercel.app`

---

## Passo 6 — Como os usuários instalam no celular

### Android (Chrome):
1. Abrem o link no Chrome
2. Aparece um banner "Adicionar à tela inicial" automaticamente
3. Tocam em adicionar → ícone do Mover aparece na tela do celular
4. Abre como app, sem barra do navegador

### iPhone (Safari):
1. Abrem o link no **Safari** (obrigatório, não Chrome)
2. Tocam no botão de compartilhar (quadrado com setinha ↑)
3. Rolam e tocam em **"Adicionar à Tela de Início"**
4. Ícone aparece na tela

---

## Passo 7 — Domínio próprio (opcional, ~R$50/ano)

Se quiser um link mais bonito tipo `mover.run` ou `grupomover.com.br`:
1. Compre o domínio em https://registro.br (`.com.br`) ou https://namecheap.com
2. No Vercel → **Settings → Domains** → adicione seu domínio
3. Siga as instruções de DNS

---

## Atualizações futuras

Sempre que quiser mudar algo no app:
1. Edite os arquivos
2. Rode no terminal:
   ```
   git add .
   git commit -m "descrição da mudança"
   git push
   ```
3. O Vercel detecta automaticamente e atualiza em ~1 minuto
4. Todos os usuários já recebem a atualização na próxima vez que abrirem

---

## Resumo de custos

| Item | Custo |
|------|-------|
| Supabase (banco + auth + edge functions) | **Gratuito** até 50k usuários |
| Vercel (hospedagem do app) | **Gratuito** forever |
| GitHub (repositório) | **Gratuito** |
| Domínio (opcional) | ~R$50/ano |
| **TOTAL** | **R$ 0** (sem domínio) |

---

## Estrutura do projeto

```
mover-pwa/
├── index.html
├── vite.config.ts         ← configura PWA
├── vercel.json            ← deploy automático
├── supabase_schema.sql    ← banco de dados
├── src/
│   ├── main.tsx           ← entrada
│   ├── App.tsx            ← navegação + shell
│   ├── index.css          ← estilos globais
│   ├── pages/
│   │   ├── LoginPage      ← tela de login
│   │   ├── FeedPage       ← avisos
│   │   ├── CalendarPage   ← calendário
│   │   ├── TrainingPage   ← treino + QR check-in
│   │   ├── RidesPage      ← caronas
│   │   ├── MembersPage    ← gestão (só admin)
│   │   └── ProfilePage    ← perfil
│   ├── components/
│   │   └── UI.tsx         ← componentes reutilizáveis
│   ├── services/
│   │   ├── supabase.ts    ← cliente do banco
│   │   └── api.ts         ← todas as chamadas
│   ├── hooks/
│   │   └── useAuth.tsx    ← autenticação
│   └── types/
│       └── index.ts       ← tipagem
```
