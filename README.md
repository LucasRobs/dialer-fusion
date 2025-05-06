# Dialer Fusion

Dialer Fusion é uma plataforma de comunicação inteligente com assistentes de IA para gerenciar chamadas telefônicas.

## Configuração

### Pré-requisitos

- Node.js 18 ou superior
- npm ou yarn
- Conta no Supabase

### Instalação

1. Clone o repositório:
\`\`\`bash
git clone https://github.com/seu-usuario/dialer-fusion.git
cd dialer-fusion
\`\`\`

2. Instale as dependências:
\`\`\`bash
npm install
# ou
yarn install
\`\`\`

3. Configure as variáveis de ambiente:
   - Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=https://wwzlfjoiuoocbatfizac.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3emxmam9pdW9vY2JhdGZpemFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNTY5ODEsImV4cCI6MjA1ODkzMjk4MX0.D10AhJ4BeF4vWtH--RYM7WKwePOlZOhEX2tRF0hTfHU
\`\`\`

4. Configure o banco de dados:
   - Execute o script SQL `schema.sql` no seu projeto Supabase para criar as tabelas necessárias.

5. Inicie o servidor de desenvolvimento:
\`\`\`bash
npm run dev
# ou
yarn dev
\`\`\`

6. Acesse o aplicativo em [http://localhost:3000](http://localhost:3000)

## Funcionalidades

- **Autenticação**: Login e registro de usuários
- **Assistentes**: Criação e gerenciamento de assistentes de IA
- **Chamadas**: Gerenciamento de chamadas telefônicas
- **Dashboard**: Visão geral das estatísticas

## Tecnologias

- Next.js
- TypeScript
- Tailwind CSS
- Supabase (Autenticação e Banco de Dados)
- shadcn/ui (Componentes de UI)

## Estrutura do Projeto

- `/app`: Páginas e rotas do aplicativo (Next.js App Router)
- `/components`: Componentes React reutilizáveis
- `/lib`: Utilitários e configurações
- `/public`: Arquivos estáticos

## Licença

MIT
