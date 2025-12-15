# Sprint 2 Progress - AI Assistants (Week 2)

## 🎯 Sprint Goal

Integrate AI capabilities into the product management platform:
- AI infrastructure with provider abstraction (OpenAI/Anthropic/Ollama)
- Ollama for local development, OpenAI/Anthropic for production
- RAG system with embeddings
- Context-aware assistant per space
- Global orchestrator assistant
- Chat interface
- Foundation for BYO token and multi-model support

**Architecture**: See `AI_ARCHITECTURE.md` for detailed design

**Status**: 🟡 In Progress  
**Started**: December 15, 2024

---

## 📋 Tasks

### 2.1 AI Infrastructure Setup

**Environment & Configuration**:
- [ ] Add AI environment variables to `.env.example`
  - `AI_DEFAULT_PROVIDER` (openai | anthropic | ollama)
  - **OpenAI**: `AI_OPENAI_API_KEY`, `AI_OPENAI_CHAT_MODEL`, `AI_OPENAI_EMBED_MODEL`
  - **Anthropic**: `AI_ANTHROPIC_API_KEY`, `AI_ANTHROPIC_CHAT_MODEL`
  - **Ollama**: `AI_OLLAMA_URL`, `AI_OLLAMA_CHAT_MODEL`, `AI_OLLAMA_EMBED_MODEL`
- [ ] Parse AI config in `apps/backend/src/lib/env.ts`
- [ ] Install AI SDK packages:
  - `openai`
  - `@anthropic-ai/sdk`

**Provider Abstraction** (`apps/backend/src/services/ai/`):
- [ ] Create `types.ts` - Common interfaces
  - `AIProvider` interface
  - `ChatMessage`, `ChatResponse`, `EmbeddingResponse` types
- [ ] Create `providers/openai.ts` - OpenAI implementation
  - Implements `AIProvider` interface
  - Chat completions
  - Embeddings (text-embedding-3-small)
- [ ] Create `providers/anthropic.ts` - Anthropic implementation
  - Implements `AIProvider` interface
  - Chat completions
  - No embeddings (throw error)
- [ ] Create `providers/ollama.ts` - Ollama implementation
  - Implements `AIProvider` interface
  - Chat completions via HTTP
  - Embeddings (nomic-embed-text)
- [ ] Create `factory.ts` - Provider factory
  - Credential resolution (user → org → system)
  - Provider instantiation
  - Fallback to env vars
- [ ] Create `usage.ts` - Usage tracking service
  - Log all AI calls
  - Calculate costs
  - Track tokens

---

### 2.2 Database Schema - AI Tables

**Install pgvector**:
- [ ] Add pgvector extension to PostgreSQL
- [ ] Install `pgvector` npm package
- [ ] Update Drizzle config for vector support

**Tables to Create**:

**1. `ai_provider_config` - System/Org AI Configuration**:
```typescript
- id: text (PK)
- organizationId: text (FK, nullable) // null = system default
- provider: 'openai' | 'anthropic' | 'ollama'
- apiKey: text (encrypted, nullable) // null for Ollama
- apiUrl: text (nullable) // for custom Ollama endpoint
- isEnabled: boolean
- createdAt: timestamp
- updatedAt: timestamp
```

**2. `ai_user_credential` - User BYO Tokens** (Foundation for Sprint 3+):
```typescript
- id: text (PK)
- userId: text (FK)
- provider: 'openai' | 'anthropic'
- apiKey: text (encrypted)
- isEnabled: boolean
- createdAt: timestamp
- updatedAt: timestamp
```

**3. `ai_model_config` - Available Models** (Foundation for Sprint 3+):
```typescript
- id: text (PK)
- provider: 'openai' | 'anthropic' | 'ollama'
- modelId: text // e.g., 'gpt-4', 'llama3'
- displayName: text
- capabilities: text[] // ['chat', 'embeddings']
- contextWindow: integer
- costPer1kTokensInput: decimal (nullable)
- costPer1kTokensOutput: decimal (nullable)
- isEnabled: boolean
- isDefault: boolean
- createdAt: timestamp
```

**4. `ai_conversation` table**:
```typescript
- id: text (PK)
- contextSpaceId: text (FK, nullable for global)
- userId: text (FK)
- organizationId: text (FK)
- type: 'context_space' | 'global'
- createdAt: timestamp
```

**5. `ai_message` table**:
```typescript
- id: text (PK)
- conversationId: text (FK)
- role: 'user' | 'assistant' | 'system'
- content: text
- createdAt: timestamp
```

**6. `embedding` table**:
```typescript
- id: text (PK)
- contextSpaceId: text (FK)
- sourceType: 'description' | 'feature_request' | 'integration_data'
- sourceId: text
- content: text
- embedding: vector(1536)
- createdAt: timestamp
```

**7. `ai_usage_log` - Track Usage & Costs**:
```typescript
- id: text (PK)
- userId: text (FK)
- organizationId: text (FK)
- provider: 'openai' | 'anthropic' | 'ollama'
- modelId: text
- capability: 'chat' | 'embeddings'
- tokensInput: integer
- tokensOutput: integer
- cost: decimal
- credentialSource: 'user' | 'organization' | 'system'
- conversationId: text (FK, nullable)
- createdAt: timestamp
```

**Tasks**:
- [ ] Add constants for AI types to `apps/common/src/constants.ts`
  - `AI_PROVIDERS`, `CONVERSATION_TYPES`, `MESSAGE_ROLES`, `EMBEDDING_SOURCE_TYPES`
  - `AI_CAPABILITIES`, `CREDENTIAL_SOURCES`
- [ ] Add schemas to `apps/backend/src/db/schema.ts`
- [ ] Add Drizzle relations for AI tables
- [ ] Generate migration: `pnpm --filter backend db:generate`
- [ ] Apply migration: `pnpm --filter backend db:push`
- [ ] Seed initial model configs (gpt-4, claude-3-5-sonnet, llama3)

---

### 2.3 RAG System

**Service**: `apps/backend/src/services/ai/rag.ts`

**Functions to implement**:
- [ ] `generateEmbedding(userId, organizationId, text)` → `number[]`
  - Use AI provider factory to get embedding provider
  - Prefer OpenAI or Ollama (Anthropic doesn't support embeddings)
  - Log usage via `AIUsageService`
  - Model: text-embedding-3-small (OpenAI) or nomic-embed-text (Ollama)
  
- [ ] `storeEmbedding(params)` → `Embedding`
  - Store embedding in database
  - Link to source (context space, feature request, etc.)
  
- [ ] `searchSimilar(embedding, contextSpaceId?, limit)` → `Embedding[]`
  - Vector similarity search with pgvector (cosine distance)
  - Filter by context space if provided
  - Return top N similar results
  
- [ ] `getContextForSpace(contextSpaceId)` → `string`
  - Get full context for a space
  - Include: description, parent chain, children, feature requests
  - Retrieve similar embeddings for RAG

**Auto-embedding hooks**:
- [ ] Hook on context space create/update → embed description
- [ ] Hook on feature request create/update → embed title + description
- [ ] Batch re-embedding utility for existing data

---

### 2.4 Context Space Assistant

**Service**: `apps/backend/src/services/ai/context-assistant.ts`

**Core Features**:
1. **Auto Summary** - Generate summary of context space
2. **Duplicate Detection** - Find duplicate feature requests
3. **Theme Grouping** - Group features by problem/theme
4. **Quick Wins** - Identify easy wins
5. **Feature Suggestions** - Suggest new features
6. **Contextual Chat** - Q&A about the space

**Assistant Context Scope**:
- The space itself (name, description, metadata)
- Parent spaces (chain to root)
- Child spaces (recursive)
- All feature requests in scope
- Similar contexts (via embeddings)

**Functions to implement**:
- [ ] `generateSummary(contextSpaceId)` → `{ summary: string }`
- [ ] `detectDuplicates(contextSpaceId)` → `{ groups: DuplicateGroup[] }`
- [ ] `groupByTheme(contextSpaceId)` → `{ themes: ThemeGroup[] }`
- [ ] `identifyQuickWins(contextSpaceId)` → `{ quickWins: FeatureRequest[] }`
- [ ] `suggestFeatures(contextSpaceId)` → `{ suggestions: string[] }`
- [ ] `chat(userId, organizationId, conversationId, message)` → `{ response: string }`
  - Use AI provider factory for LLM
  - Log usage via `AIUsageService`

**System Prompts**:
- [ ] Create prompt templates for each function
- [ ] Include context scope in prompts
- [ ] Use few-shot examples for better results

**tRPC Router**: `apps/backend/src/router/context-assistant.ts`
- [ ] `generateSummary` - Generate space summary (uses AI factory)
- [ ] `detectDuplicates` - Detect duplicate requests (uses AI factory)
- [ ] `groupByTheme` - Group by theme (uses AI factory)
- [ ] `identifyQuickWins` - Find quick wins (uses AI factory)
- [ ] `suggestFeatures` - AI suggestions (uses AI factory)
- [ ] `startConversation` - Create new conversation
- [ ] `sendMessage` - Send message in conversation (uses AI factory + usage tracking)
- [ ] `getConversation` - Get conversation history
- [ ] `getUsage` - Get AI usage stats for context space (optional)

---

### 2.5 Global Assistant (Orchestrator)

**Service**: `apps/backend/src/services/ai/global-assistant.ts`

**Core Features**:
1. **Multi-Space Analysis** - Query across multiple spaces
2. **Cross-Cutting Decisions** - Help with product strategy
3. **Smart Space Selection** - AI recommends relevant spaces
4. **Auto Mode** - AI chooses spaces based on query
5. **Manual Mode** - User selects specific spaces

**Functions to implement**:
- [ ] `chat(userId, organizationId, conversationId, message, selectedSpaceIds?)` → `{ response: string }`
  - Use AI provider factory for LLM
  - Log usage via `AIUsageService`
  - If `selectedSpaceIds` provided: use those spaces
  - If not: AI determines relevant spaces
  
- [ ] `analyzeAcrossSpaces(spaceIds)` → `{ analysis: string }`
  - Cross-space analysis and insights
  
- [ ] `recommendSpaces(query)` → `{ spaces: ContextSpace[] }`
  - Use embeddings to find relevant spaces
  - Return top N spaces for user selection

**tRPC Router**: `apps/backend/src/router/global-assistant.ts`
- [ ] `startConversation` - Create global conversation
- [ ] `sendMessage` - Send message (with optional space selection, uses AI factory)
- [ ] `getConversation` - Get history
- [ ] `recommendSpaces` - Get space recommendations for query (uses embeddings)
- [ ] `getUsage` - Get AI usage stats for organization (optional)

---

### 2.6 Zod Schemas - AI

**File**: `apps/common/src/schemas/ai.ts` (new)

**Schemas to create**:
- [ ] `startConversationSchema` - Start conversation input
- [ ] `sendMessageSchema` - Send message input
- [ ] `generateSummarySchema` - Summary input
- [ ] `detectDuplicatesSchema` - Duplicates input
- [ ] `groupByThemeSchema` - Theme grouping input
- [ ] Export all types

---

### 2.7 Frontend - AI Components

**Components**: `apps/frontend/src/components/ai/`

- [ ] `AssistantChat.vue` - Chat interface
  - Message list with user/assistant messages
  - Input field with send button
  - Typing indicator
  - Markdown rendering for AI responses
  - Auto-scroll to latest message
  
- [ ] `AssistantSummary.vue` - Display auto-generated summary
  - Summary card with refresh button
  - Loading skeleton
  - Edit/regenerate options
  
- [ ] `DuplicateDetection.vue` - Show duplicate groups
  - Grouped duplicates with merge actions
  - Similarity scores
  - Preview before merge
  
- [ ] `ThemeGrouping.vue` - Display feature themes
  - Collapsible theme groups
  - Feature request cards
  - Drag & drop to reassign
  
- [ ] `QuickWins.vue` - Show quick win suggestions
  - Prioritized list
  - Effort/impact estimates
  - Quick actions
  
- [ ] `FeatureSuggestions.vue` - AI feature suggestions
  - Suggestion cards
  - Vote/dismiss actions
  - Create feature from suggestion
  
- [ ] `SpaceSelector.vue` - Multi-space selector
  - Search/filter spaces
  - Checkbox selection
  - "Let AI choose" option

---

### 2.8 Frontend - AI Pages

**Pages**: `apps/frontend/src/views/`

- [ ] `ContextSpaceAssistant.vue` - `/spaces/:id/assistant`
  - Tab layout: Summary | Insights | Chat
  - Summary tab: auto summary + quick wins
  - Insights tab: duplicates + themes + suggestions
  - Chat tab: contextual assistant chat
  
- [ ] `GlobalAssistant.vue` - `/assistant`
  - Space selector (manual/auto mode)
  - Chat interface
  - Recommended spaces sidebar

**Routes to add**:
- [ ] `/spaces/:id/assistant` - Context assistant
- [ ] `/assistant` - Global assistant

**Navigation**:
- [ ] Add "Assistant" button to `ContextSpaceDetail.vue`
- [ ] Add "AI Assistant" to sidebar (with Sparkles icon)

---

### 2.9 Frontend - AI Store

**Store**: `apps/frontend/src/stores/ai.ts` (new)

**State**:
- [ ] `conversations` - Map of conversations by ID
- [ ] `currentConversation` - Active conversation
- [ ] `loading` - Loading states
- [ ] `streamingMessage` - Current streaming message

**Actions**:
- [ ] `startConversation(type, contextSpaceId?)` - Create conversation
- [ ] `sendMessage(conversationId, message)` - Send message
- [ ] `loadConversation(conversationId)` - Load history
- [ ] `generateSummary(contextSpaceId)` - Trigger summary
- [ ] `detectDuplicates(contextSpaceId)` - Trigger duplicates
- [ ] `groupByTheme(contextSpaceId)` - Trigger grouping

---

### 2.10 i18n - AI Translations

**File**: `apps/frontend/src/i18n/en.json`

**Keys to add**:
- [ ] `ai.assistant.*` - Assistant strings
- [ ] `ai.chat.*` - Chat interface strings
- [ ] `ai.summary.*` - Summary strings
- [ ] `ai.duplicates.*` - Duplicate detection strings
- [ ] `ai.themes.*` - Theme grouping strings
- [ ] `ai.quick_wins.*` - Quick wins strings
- [ ] `ai.suggestions.*` - Feature suggestions strings

---

## 🎯 WOW Moment

**Goal**: Users get immediate value from AI without any setup

**Experience**:
1. User creates a context space with description
2. AI automatically generates:
   - Summary of the space
   - 3-5 suggested starter questions
   - Initial feature suggestions
3. User sees this within 2-3 seconds
4. User can immediately start chatting with context-aware assistant

**Implementation**:
- [ ] Auto-trigger summary on space creation
- [ ] Pre-generate suggested questions based on description
- [ ] Show loading state with animated sparkles
- [ ] Display results in welcome card

---

## ⚠️ Dependencies

**Required**:
- [ ] PostgreSQL with pgvector extension
- [ ] **For Development**: Ollama installed locally
  - `brew install ollama` (macOS)
  - `ollama pull llama3`
  - `ollama pull nomic-embed-text`
  - `ollama serve` (runs on http://localhost:11434)
- [ ] **For Production**: OpenAI or Anthropic API key
  - OpenAI recommended for embeddings
  - Anthropic for high-quality chat

**Nice to have**:
- [ ] Redis for caching embeddings (performance)
- [ ] Rate limiting for AI calls
- [ ] Master encryption key for BYO token storage

---

## 📊 Success Criteria

### Functionality
- [ ] User can chat with context-aware assistant
- [ ] Assistant provides relevant, helpful responses
- [ ] Duplicate detection works accurately
- [ ] Theme grouping makes sense
- [ ] Global assistant can query multiple spaces
- [ ] Embeddings are generated automatically

### Performance
- [ ] Chat responses within 3-5 seconds
- [ ] Summary generation within 5 seconds
- [ ] Duplicate detection within 10 seconds
- [ ] Vector search < 500ms

### UX
- [ ] Chat interface is intuitive
- [ ] Loading states are clear
- [ ] AI responses are well-formatted
- [ ] Error messages are helpful

---

## 📝 Notes

### Development Workflow
- **Default**: Use Ollama for free local testing
- **Switch to OpenAI**: Set `AI_DEFAULT_PROVIDER=openai` in `.env`
- **Test all providers**: Ensure abstraction works with all three

### Architecture Benefits
- ✅ Zero cost development with Ollama
- ✅ Easy switch between providers
- ✅ Foundation for BYO token (Sprint 3+)
- ✅ Foundation for multi-model support (Sprint 3+)
- ✅ Usage tracking from day 1
- ✅ Cost transparency

### Best Practices
- Use streaming for chat responses if possible
- Implement proper error handling for AI failures
- Add rate limiting to prevent API abuse
- Consider cost optimization (caching, model selection)
- Use system prompts to maintain consistent tone
- Test with various context space types
- Always log usage for cost tracking
- Encrypt API keys in database

### Migration Path
- **Sprint 2**: Provider abstraction + system credentials only
- **Sprint 3**: Add BYO token UI and org-level configs
- **Sprint 4**: Multi-model selection per conversation

---

## 🚀 Next Steps After Sprint 2

**Sprint 3 - Integrations**:
- Linear integration
- Jira integration
- Slack notifications
- Webhook system

---

**Sprint 2 Status**: 🟡 Not Started  
**Estimated Time**: 20-24 hours  
**Target Completion**: Week 2
