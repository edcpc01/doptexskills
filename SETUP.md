# SETUP COMPLETO — Doptex Skills PWA

## Pré-requisitos

- Node.js 18+
- Conta Google (para Firebase)
- Conta GitHub
- Conta Vercel (gratuita)

---

## PASSO 1 — Firebase

### 1.1 Criar o projeto

1. Acesse https://console.firebase.google.com
2. "Adicionar projeto" → nome: `doptex-skills`
3. Desative Analytics → Criar

### 1.2 Ativar Authentication

1. Menu: Build → Authentication → Get Started
2. Sign-in method → ative "Email/Password"
3. Aba Users → criar primeiro usuário admin:
   - Email: admin@doptex.com
   - Senha: (sua escolha)
4. COPIE o UID do usuário criado (vai precisar no passo 1.5)

### 1.3 Criar Firestore

1. Build → Firestore Database → Create database
2. Localização: southamerica-east1 (São Paulo)
3. Modo: Production
4. Após criar, aba Rules → cole o conteúdo do arquivo `firestore.rules`
5. Publique as rules

### 1.4 Copiar credenciais

**Client SDK:**
1. Project Settings (engrenagem) → General → Your apps → ícone Web
2. Registre como "doptex-skills-web"
3. Copie o objeto firebaseConfig

**Admin SDK:**
1. Project Settings → Service accounts
2. "Generate new private key" → baixe o JSON

### 1.5 Criar documento do Admin no Firestore

No Firestore Console, crie manualmente:

- Collection: `users`
- Document ID: (cole o UID copiado no passo 1.2)
- Campos:
  - `uid` (string): o mesmo UID
  - `email` (string): admin@doptex.com
  - `role` (string): admin
  - `nome` (string): Administrador

---

## PASSO 2 — GitHub

### 2.1 Extrair o projeto

Extraia o ZIP `doptex-skills-project.zip` em uma pasta local.

### 2.2 Subir para o GitHub

```bash
cd doptex-skills
git init
git add .
git commit -m "feat: Doptex Skills PWA - v1.0"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/doptex-skills.git
git push -u origin main
```

---

## PASSO 3 — Vercel

### 3.1 Conectar

1. Acesse https://vercel.com → Login com GitHub
2. "Add New" → "Project"
3. Selecione o repositório `doptex-skills`
4. Framework: Next.js (autodetectado)

### 3.2 Environment Variables

Antes de clicar Deploy, adicione TODAS estas variáveis:

```
NEXT_PUBLIC_FIREBASE_API_KEY         = (do firebaseConfig)
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN     = (do firebaseConfig)
NEXT_PUBLIC_FIREBASE_PROJECT_ID      = (do firebaseConfig)
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET  = (do firebaseConfig)
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = (do firebaseConfig)
NEXT_PUBLIC_FIREBASE_APP_ID          = (do firebaseConfig)
FIREBASE_PROJECT_ID                  = (do JSON do service account)
FIREBASE_CLIENT_EMAIL                = (do JSON do service account)
FIREBASE_PRIVATE_KEY                 = (do JSON do service account - incluir aspas e \n)
NEXT_PUBLIC_APP_URL                  = https://doptex-skills.vercel.app
```

**ATENÇÃO com FIREBASE_PRIVATE_KEY:** Cole a chave inteira incluindo
`-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`.
Substitua quebras de linha reais por `\n`.

### 3.3 Deploy

Clique Deploy e aguarde (~2 min).

### 3.4 Pós-deploy

1. No Firebase Console → Authentication → Settings → Authorized domains
   → Adicione: `doptex-skills.vercel.app` (ou o domínio gerado pelo Vercel)

2. Popule os dados iniciais executando:
```bash
curl -X POST https://SEU-DOMINIO.vercel.app/api/seed
```

3. Acesse o app e faça login com admin@doptex.com

---

## PASSO 4 — Criar usuários Gestor e Colaborador

### No Firebase Console:

1. Authentication → Users → Add user
   - gestor@doptex.com / senha
   - (repita para cada colaborador que precisar de acesso)

### No Firestore:

Para cada usuário, crie um documento em `users`:
```
Document ID: (UID do user)
uid: "UID"
email: "email@doptex.com"
role: "gestor" ou "colaborador"
nome: "Nome Completo"
colaboradorId: (para colaboradores: ID do documento na collection colaboradores)
```

---

## PASSO 5 — Google Forms (Provas)

### 5.1 Criar formulários

1. Para cada competência/nível, crie um Google Form em modo Quiz
2. Ative "Collect email addresses"
3. Adicione as perguntas com respostas corretas marcadas

### 5.2 Configurar webhook

Em cada Form:
1. Extensions → Apps Script
2. Cole o script do webhook (ver README.md)
3. Salve e autorize
4. Edit → Current project's triggers → Add trigger:
   - Function: onFormSubmit
   - Event type: On form submit

### 5.3 Vincular no app

No Firestore, na collection `provas_templates` (criar manualmente):
```
competenciaId: "ID_DA_COMPETENCIA"
nivelAlvo: 3
googleFormUrl: "https://docs.google.com/forms/d/FORM_ID/viewform"
```

---

## Comandos úteis

```bash
# Rodar localmente
npm run dev

# Build de produção
npm run build

# Verificar types
npx tsc --noEmit

# Popular dados iniciais
curl -X POST http://localhost:3000/api/seed
```

---

## Solução de problemas

| Problema | Solução |
|----------|---------|
| "auth/invalid-api-key" | Verifique NEXT_PUBLIC_FIREBASE_API_KEY no Vercel |
| "permission-denied" no Firestore | Verifique se as rules foram publicadas e o documento `users` existe |
| Login não funciona no Vercel | Adicione o domínio Vercel em Firebase Auth → Authorized domains |
| Seed retorna erro | Verifique FIREBASE_PRIVATE_KEY (deve ter \n entre aspas) |
| Página em branco | Verifique o console do navegador — provavelmente env var faltando |
