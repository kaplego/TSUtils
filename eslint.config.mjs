import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import cspellPlugin from '@cspell/eslint-plugin';

/** @satisfies {import('eslint').Linter.Config} */
const config = [
	{
		files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
		ignores: ['dist/**/*'],
		rules: {
			semi: ['error', 'always'],
			quotes: [
				'error',
				'single',
				{
					avoidEscape: true,
				},
			],
			'indent-legacy': ['error', 'tab', { SwitchCase: 1 }],
			'prefer-const': [
				'error',
				{
					destructuring: 'all',
				},
			],
			'no-var': 'warn',
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					args: 'all',
					argsIgnorePattern: '^_',
					caughtErrors: 'all',
					caughtErrorsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					ignoreRestSiblings: true,
				},
			],
			'max-len': [
				'error',
				{
					code: 120,
				},
			],
		},
		plugins: {
			'@typescript-eslint': typescriptPlugin,
		},
		languageOptions: {
			parser: typescriptParser,
		},
	},
	{
		ignores: ['**/*.test.ts'],
		rules: {
			'@cspell/spellchecker': [
				'warn',
				{
					cspell: {
						language: 'en-GB',
						words: ['vars', 'flexbox'],
					},
					checkIdentifiers: false,
				},
			],
		},
		plugins: {
			'@cspell': cspellPlugin,
		},
	},
];

export default config;
