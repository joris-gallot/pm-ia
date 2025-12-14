import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  yaml: true,
  ignores: ['**/dist', '**/node_modules', '**/playwright-report', '**/test-results', '*.md', 'pnpm-workspace.yaml'],
})
