import tsParser from '@typescript-eslint/parser'
import vue from 'eslint-plugin-vue'

export default [
  { ignores: ['.nuxt/**', '.output/**', 'dist/**', 'coverage/**', 'node_modules/**', 'drizzle/migrations/**'] },
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser, parserOptions: { sourceType: 'module' } },
  },
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tsParser, extraFileExtensions: ['.vue'] } },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/html-self-closing': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-indent': 'off',
    },
  },
]