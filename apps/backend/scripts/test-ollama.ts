/* eslint-ignore no-console */
import process from 'node:process'
import { AIProviderFactory } from '../src/services/ai/factory.js'
import { OllamaProvider } from '../src/services/ai/providers/ollama.js'

/**
 * Test script for Ollama integration
 *
 * Run this to verify Ollama is working:
 * 1. Make sure Ollama is running: `ollama serve`
 * 2. Make sure models are pulled:
 *    - `ollama pull llama3`
 *    - `ollama pull nomic-embed-text`
 * 3. Run: `tsx apps/backend/src/services/ai/test-ollama.ts`
 */

async function testOllamaProvider() {
  console.log('🧪 Testing Ollama Provider...\n')

  const provider = new OllamaProvider(
    'http://localhost:11434',
    'llama3',
    'nomic-embed-text',
  )

  // Test 1: List models
  console.log('📋 Test 1: List available models')
  try {
    const models = await provider.listModels()
    console.log('✅ Available models:', models.slice(0, 5))

    if (!models.find(m => m.includes('llama3'))) {
      console.warn('⚠️  llama3 not found. Run: ollama pull llama3')
    }
    if (!models.find(m => m.includes('nomic-embed-text'))) {
      console.warn('⚠️  nomic-embed-text not found. Run: ollama pull nomic-embed-text')
    }
  }
  catch (error) {
    console.error('❌ Failed to list models:', error)
    console.log('Make sure Ollama is running: ollama serve')
    return
  }

  // Test 2: Chat completion
  console.log('\n💬 Test 2: Chat completion')
  try {
    const response = await provider.chat([
      { role: 'system', content: 'You are a helpful assistant. Be concise.' },
      { role: 'user', content: 'What is 2+2? Answer in one sentence.' },
    ])
    console.log('✅ Response:', response.content)
    console.log('📊 Tokens - Input:', response.tokensInput, 'Output:', response.tokensOutput)
    console.log('🏷️  Model:', response.model)
  }
  catch (error) {
    console.error('❌ Failed chat completion:', error)
  }

  // Test 3: Embeddings
  console.log('\n🔢 Test 3: Generate embeddings')
  try {
    const embedding = await provider.embed('Hello, this is a test sentence for embeddings.')
    console.log('✅ Embedding generated')
    console.log('📏 Vector dimensions:', embedding.embedding.length)
    console.log('🔍 First 5 values:', embedding.embedding.slice(0, 5))
    console.log('🏷️  Model:', embedding.model)
  }
  catch (error) {
    console.error('❌ Failed to generate embedding:', error)
  }

  // Test 4: Conversation with context
  console.log('\n🗣️  Test 4: Multi-turn conversation')
  try {
    const response = await provider.chat([
      { role: 'system', content: 'You are a product manager assistant.' },
      { role: 'user', content: 'What are the key principles of good product management?' },
      { role: 'assistant', content: 'Key principles include: understanding user needs, data-driven decisions, clear prioritization, and effective communication.' },
      { role: 'user', content: 'How do I prioritize features?' },
    ])
    console.log('✅ Response:', `${response.content.slice(0, 200)}...`)
    console.log('📊 Tokens - Input:', response.tokensInput, 'Output:', response.tokensOutput)
  }
  catch (error) {
    console.error('❌ Failed conversation:', error)
  }
}

async function testProviderFactory() {
  console.log('\n\n🏭 Testing Provider Factory...\n')

  // Mock user and org IDs
  const userId = 'test-user-123'
  const organizationId = 'test-org-456'

  // Test 5: Get default provider
  console.log('🔧 Test 5: Get default provider')
  try {
    const result = await AIProviderFactory.getProvider(userId, organizationId)
    console.log('✅ Provider:', result.providerName)
    console.log('📍 Source:', result.source)
    console.log('🏷️  Name:', result.provider.name)
  }
  catch (error) {
    console.error('❌ Failed to get provider:', error)
  }

  // Test 6: Get embedding provider
  console.log('\n📊 Test 6: Get embedding provider')
  try {
    const result = await AIProviderFactory.getEmbeddingProvider(userId, organizationId)
    console.log('✅ Provider:', result.providerName)
    console.log('📍 Source:', result.source)

    // Test the provider
    const embedding = await result.provider.embed('Test embedding via factory')
    console.log('✅ Embedding generated via factory')
    console.log('📏 Dimensions:', embedding.embedding.length)
  }
  catch (error) {
    console.error('❌ Failed to get embedding provider:', error)
  }

  // Test 7: Override provider (should fail if OpenAI not configured)
  console.log('\n🔄 Test 7: Try to override to OpenAI (should fail gracefully)')
  try {
    const result = await AIProviderFactory.getProvider(userId, organizationId, 'openai')
    console.log('⚠️  Got OpenAI provider (unexpected, API key must be set)')
    console.log('📍 Source:', result.source)
  }
  catch (error) {
    console.log('✅ Expected error:', (error as Error).message)
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  🤖 Ollama Integration Test Suite')
  console.log('═══════════════════════════════════════════════════════\n')

  try {
    await testOllamaProvider()
    await testProviderFactory()

    console.log('\n\n═══════════════════════════════════════════════════════')
    console.log('  ✅ All tests completed!')
    console.log('═══════════════════════════════════════════════════════\n')
  }
  catch (error) {
    console.error('\n\n❌ Test suite failed:', error)
    process.exit(1)
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { testOllamaProvider, testProviderFactory }
