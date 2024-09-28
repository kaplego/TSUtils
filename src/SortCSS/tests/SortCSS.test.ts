import SortCSS, { SortMethod } from '../SortCSS';
import { describe, it } from 'mocha';
import { readFileSync } from 'fs';
import assert = require('assert');

describe('SortCSS', () => {
	it('should return the CSS file sorted by category with comments', () => {
		assert.equal(
			SortCSS(
				{
					type: 'file',
					path: './src/SortCSS/tests/1-3_Input.css',
				},
				'string',
				{
					addCategoryComments: true,
				}
			),
			readFileSync('./src/SortCSS/tests/1_Expect.css').toString()
		);
	});
});

describe('SortCSS', () => {
	it('should return the CSS file sorted by category without comments', () => {
		assert.equal(
			SortCSS(
				{
					type: 'file',
					path: './src/SortCSS/tests/1-3_Input.css',
				},
				'string'
			),
			readFileSync('./src/SortCSS/tests/2_Expect.css').toString()
		);
	});
});

describe('SortCSS', () => {
	it('should return the CSS file sorted by name', () => {
		assert.equal(
			SortCSS(
				{
					type: 'file',
					path: './src/SortCSS/tests/1-3_Input.css',
				},
				'string',
				{
					sortMethod: SortMethod.Alphabetical,
				}
			),
			readFileSync('./src/SortCSS/tests/3_Expect.css').toString()
		);
	});
});

describe('SortCSS', () => {
	it('should return the CSS file sorted by category with comments', () => {
		assert.equal(
			SortCSS(
				{
					type: 'file',
					path: './src/SortCSS/tests/4_Input_Expect.css',
				},
				'string',
				{
					addCategoryComments: true,
				}
			),
			readFileSync('./src/SortCSS/tests/4_Input_Expect.css').toString()
		);
	});
});
