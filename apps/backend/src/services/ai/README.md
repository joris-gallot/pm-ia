# AI Services - Implementation Status

## 🎯 Current State (Sprint 2 - Phase 1)

### ✅ Implemented

1. **Provider Abstraction**
   - `types.ts` - Common interfaces for all providers
   - `AIProvider` interface with chat, embed, and listModels
   - `ChatMessage`, `ChatResponse`, `EmbeddingResponse` types

2. **Ollama Provider** (FULLY FUNCTIONAL)
   - `providers/ollama.ts` - Complete implementation
   - Chat completions via `/api/chat`
   - Embeddings via `/api/embeddings`
   - Model listing via `/api/tags`
   - Ready for local development

3. **Provider Factory**
   - `factory.ts` - Provider instantiation and selection
   - System credentials only (from env vars)
   - Auto-fallback to Ollama for embeddings when using Anthropic
   - `getProvider(userId, orgId, preferredProvider?)` method
   - `getEmbeddingProvider(userId, orgId)` method

4. **Usage Tracking Service** (STUB)
   - `usage.ts` - Basic structure in place
   - Console logging in development
   - Ready for DB implementation

### 🚧 TODO - Stubs Created

1. **OpenAI Provider**
   - `providers/openai.ts` - Stub with commented implementation guide
   - Will throw errors if selected
   - Install required: `pnpm add openai`

2. **Anthropic Provider**
   - `providers/anthropic.ts` - Stub with commented implementation guide
   - Will throw errors if selected
   - Install required: `pnpm add @anthropic-ai/sdk`
   - Note: Does not support embeddings (by design)

3. **Usage Tracking**
   - Database integration pending
   - Cost calculation pending
   - Usage limits pending

## 🚀 Quick Start (Development)

### 1. Install Ollama

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Pull Models

```bash
ollama pull llama3           # For chat
ollama pull nomic-embed-text # For embeddings
```

### 3. Start Ollama

```bash
ollama serve
# Runs on http://localhost:11434
```

### 4. Configure Environment

Your `.env` should have:

```env
AI_DEFAULT_PROVIDER=ollama
AI_OLLAMA_URL=http://localhost:11434
AI_OLLAMA_CHAT_MODEL=llama3
AI_OLLAMA_EMBED_MODEL=nomic-embed-text
```

### 5. Use in Your Code

```typescript
import { AIProviderFactory } from '@/services/ai/factory'

// Get provider for user
const { provider, source, providerName } = await AIProviderFactory.getProvider(
  userId,
  organizationId
)

// Chat completion
const response = await provider.chat([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello!' }
])

console.log(response.content) // AI response
console.log(response.tokensInput, response.tokensOutput) // Token usage

// Generate embedding
const embedding = await provider.embed('Some text to embed')
console.log(embedding.embedding) // number[] vector
```

## 📁 File Structure

```
services/ai/
├── README.md                 # This file
├── types.ts                  # ✅ Common interfaces
├── factory.ts                # ✅ Provider factory (system credentials only)
├── usage.ts                  # 🚧 Usage tracking (stub)
└── providers/
    ├── ollama.ts            # ✅ Ollama implementation (WORKS)
    ├── openai.ts            # 🚧 OpenAI stub (TODO)
    └── anthropic.ts         # 🚧 Anthropic stub (TODO)
```

## 🔄 Next Steps

### Immediate (Sprint 2)
1. ✅ Environment variables
2. ✅ Constants
3. ✅ Provider abstraction
4. ✅ Ollama implementation
5. ⏭️ Database schema (ai_* tables)
6. ⏭️ RAG service (uses factory)
7. ⏭️ Context assistant service
8. ⏭️ Global assistant service

### Later (Sprint 3+)
1. Implement OpenAI provider
2. Implement Anthropic provider
3. Database-backed usage tracking
4. User BYO tokens (ai_user_credential table)
5. Organization configs (ai_provider_config table)
6. Full credential resolution chain
7. Cost calculation and limits
8. Usage analytics and reports

## 💡 Design Decisions

### Why Ollama First?
- **Free** - No API costs during development
- **Fast** - Local inference, no network latency
- **Privacy** - Data never leaves your machine
- **Offline** - Works without internet
- **Production-ready** - Can self-host for power users

### Why Abstraction?
- **Flexibility** - Easy to switch providers
- **BYO Token Ready** - Users can bring their own keys
- **Multi-Model** - Support different models per use case
- **Cost Control** - Track and limit usage
- **Vendor Independence** - Not locked into one provider

### Provider Selection Logic
```
Current (Sprint 2):
  System credentials only → Always use env.AI_DEFAULT_PROVIDER

Future (Sprint 3+):
  1. Check user's BYO token in ai_user_credential
  2. Fallback to org config in ai_provider_config  
  3. Fallback to system/env vars
```

## 🧪 Testing

### Test Ollama Chat

```typescript
import { OllamaProvider } from '@/services/ai/providers/ollama'

const provider = new OllamaProvider(
  'http://localhost:11434',
  'llama3',
  'nomic-embed-text'
)

const response = await provider.chat([
  { role: 'user', content: 'What is 2+2?' }
])

console.log(response.content) // Should return "4" or explanation
```

### Test Ollama Embeddings

```typescript
const embedding = await provider.embed('Hello world')
console.log(embedding.embedding.length) // Should be 768 for nomic-embed-text
```

### Test Factory

```typescript
import { AIProviderFactory } from '@/services/ai/factory'

const result = await AIProviderFactory.getProvider('user-123', 'org-456')
console.log(result.providerName) // 'ollama'
console.log(result.source) // 'system'
```

## 🔒 Security Notes

- API keys will be encrypted in database (Sprint 3+)
- Never log API keys or full prompts
- Sanitize user inputs before sending to AI
- Rate limit AI endpoints
- Validate all responses

## 📊 Cost Tracking (Future)

```typescript
// After Sprint 2 DB schema
import { AIUsageService } from '@/services/ai/usage'

await AIUsageService.logUsage({
  userId: 'user-123',
  organizationId: 'org-456',
  provider: 'openai',
  modelId: 'gpt-4',
  capability: 'chat',
  tokensInput: 150,
  tokensOutput: 50,
  credentialSource: 'user', // User's BYO token
  conversationId: 'conv-789'
})

// Get user usage
const usage = await AIUsageService.getUserUsage(
  'user-123',
  new Date('2024-01-01'),
  new Date('2024-01-31')
)
```

## 🆘 Troubleshooting

### "Ollama API error"
- Make sure Ollama is running: `ollama serve`
- Check Ollama is accessible: `curl http://localhost:11434/api/tags`

### "Model not found"
- Pull the model: `ollama pull llama3`
- List available models: `ollama list`

### "OpenAI/Anthropic provider not implemented"
- This is expected in Sprint 2
- Use `AI_DEFAULT_PROVIDER=ollama` for development
- OpenAI/Anthropic will be implemented when needed

---

**Status**: 🟢 Ollama Ready for Development  
**Last Updated**: Sprint 2 - Phase 1
