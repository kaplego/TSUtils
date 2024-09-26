import SortCSS, { SortMethod } from '../SortCSS';
import { describe, it } from 'mocha';
import { readFileSync } from 'fs';
import assert = require('assert');

describe('SortCSS', () => {
	it('should return the CSS file sorted by category with comments', () => {
		assert.equal(
			SortCSS({
				inputPath: './src/SortCSS/tests/1-3_Input.css',
				outputType: 'string',
				addCategoryComments: true,
			}),
			readFileSync('./src/SortCSS/tests/1_Expect.css').toString()
		);
	});
});

describe('SortCSS', () => {
	it('should return the CSS file sorted by category without comments', () => {
		assert.equal(
			SortCSS({
				inputPath: './src/SortCSS/tests/1-3_Input.css',
				outputType: 'string',
				addCategoryComments: false,
			}),
			readFileSync('./src/SortCSS/tests/2_Expect.css').toString()
		);
	});
});

describe('SortCSS', () => {
	it('should return the CSS file sorted by name', () => {
		assert.equal(
			SortCSS({
				inputPath: './src/SortCSS/tests/1-3_Input.css',
				outputType: 'string',
				sortMethod: SortMethod.Name,
			}),
			readFileSync('./src/SortCSS/tests/3_Expect.css').toString()
		);
	});
});
