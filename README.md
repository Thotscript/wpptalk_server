# WppTalk Server

Servidor de integração com WhatsApp via WppConnect, transcrição com Whisper, e processamento com GPT.

## ✅ Funcionalidades

- Login e gerenciamento de múltiplas sessões WhatsApp
- Captura de QR Code via WebSocket
- Transcrição de áudios com Whisper da OpenAI
- Análise de texto com GPT-4o (evento, lembrete, tarefa, etc.)
- Gerenciamento de filtros por usuário/sessão
- Restauração automática de sessões após queda

## 📂 Estrutura de Pastas

```
wpptalk-server/
├── server.js                  # Inicialização do servidor HTTPS
├── app.js                     # Configuração global do Express
├── config/                    # SSL, variáveis de ambiente e constantes
├── controllers/              # Lógica das rotas (recebe req/res)
├── routes/                   # Mapeamento das rotas Express
├── services/                 # Lógica principal (sessão, áudio, triggers)
├── utils/                    # Funções auxiliares
├── middlewares/             # Middleware personalizados
├── public/qrcodes/          # QR Codes salvos para autenticação
├── audios/                  # Arquivos de áudio temporários
├── prompts/                 # Arquivos de prompt dos agentes GPT
```

## 🧠 Triggers Suportados

- `evento` – cria estrutura de evento com data/hora
- `lembrete` – agenda lembrete com delay em minutos
- `tarefa` – organiza tarefas com título
- `financiamento` – responde dúvidas de financiamento

