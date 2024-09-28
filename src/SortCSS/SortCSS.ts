import * as fs from 'fs';
import * as css from 'css';
import * as detectIndent from 'identify-indent';

export enum SortMethod {
	ByCategory,
	Alphabetical,
}

const CSS_CATEGORIES = {
	layout: ['display', 'position', 'float', 'clear', 'z-index', 'overflow', 'visibility'],
	boxModel: ['width', 'height', 'margin', 'padding', 'border', 'box-sizing'],
	typography: [
		'font-family',
		'font-size',
		'font-weight',
		'font-style',
		'line-height',
		'text-align',
		'text-transform',
		'text-decoration',
	],
	color: ['color', 'background-color', 'opacity'],
	background: [
		'background-image',
		'background-repeat',
		'background-position',
		'background-size',
		'background-attachment',
	],
	list: ['list-style-type', 'list-style-image', 'list-style-position'],
	table: ['border-collapse', 'border-spacing', 'empty-cells', 'caption-side'],
	animation: [
		'animation',
		'animation-name',
		'animation-duration',
		'animation-timing-function',
		'animation-delay',
		'animation-iteration-count',
		'animation-direction',
		'animation-fill-mode',
		'animation-play-state',
	],
	transform: ['transform', 'transform-origin'],
	transition: ['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay'],
	flexbox: [
		'flex-direction',
		'flex-wrap',
		'flex-flow',
		'justify-content',
		'align-items',
		'align-content',
		'order',
		'flex-grow',
		'flex-shrink',
		'flex-basis',
		'align-self',
	],
	grid: [
		'grid-template-columns',
		'grid-template-rows',
		'grid-template-areas',
		'grid-template',
		'grid-auto-columns',
		'grid-auto-rows',
		'grid-auto-flow',
		'grid-column-gap',
		'grid-row-gap',
		'grid-gap',
		'justify-items',
		'align-items',
		'place-items',
		'justify-content',
		'align-content',
		'place-content',
		'grid-column-start',
		'grid-column-end',
		'grid-row-start',
		'grid-row-end',
		'grid-area',
		'order',
	],
};

type CSSCategory = keyof typeof CSS_CATEGORIES;
type CSSProperty = (typeof CSS_CATEGORIES)[CSSCategory][number];

const CSS_CATEGORY_POSITIONS: CSSCategory[] = [
	'layout',
	'boxModel',
	'typography',
	'color',
	'background',
	'list',
	'table',
	'animation',
	'transform',
	'transition',
	'flexbox',
	'grid',
] as const;

function category(property: CSSProperty): keyof typeof CSS_CATEGORIES {
	const entries = Object.entries<string[]>(CSS_CATEGORIES);
	for (const [category, values] of entries) {
		if (values.includes(property)) {
			return category as keyof typeof CSS_CATEGORIES;
		}
	}
}

function position(category: CSSCategory) {
	return CSS_CATEGORY_POSITIONS.indexOf(category);
}

interface ConfigOptions {
	sortMethod?: SortMethod;
	addCategoryComments?: boolean;
}

interface ConfigInputString {
	type: 'string';
	data: string;
}
interface ConfigOutputString {
	type: 'string';
}
interface ConfigFile {
	type: 'file';
	path: string;
}

type ConfigInput = string | ConfigInputString | ConfigFile;
type ConfigOutput = 'string' | ConfigOutputString | ConfigFile;

export default function SortCSS<O extends ConfigOutput>(
	inputConfig: ConfigInput,
	outputConfig: ConfigOutput = 'string',
	options: ConfigOptions = {
		sortMethod: SortMethod.ByCategory,
		addCategoryComments: false,
	}
): O extends ConfigOutputString ? string : void {
	let input: string;
	if (typeof inputConfig === 'string') input = inputConfig;
	else if (inputConfig.type === 'string') input = inputConfig.data;
	else input = fs.readFileSync(inputConfig.path).toString();

	if (!options.sortMethod) options.sortMethod = SortMethod.ByCategory;
	if (!options.addCategoryComments) options.addCategoryComments = false;

	const indent = detectIndent.string(input);
	const cssObj = css.parse(input);

	cssObj.stylesheet.rules.forEach((rule) => {
		if (rule.type === 'rule') {
			rule.declarations.sort((a, b) => {
				if (a.type === 'declaration' && b.type === 'declaration') {
					if (options.sortMethod === SortMethod.ByCategory) {
						// Get each category and compare their positions
						const catA = category(a.property as CSSProperty);
						const catB = category(b.property as CSSProperty);

						if (catA === catB) {
							// If the categories are the same, sort by property position
							return CSS_CATEGORIES[catA].indexOf(a.property) - CSS_CATEGORIES[catB].indexOf(b.property);
						} else return position(catA) - position(catB);
					} else return a.property.localeCompare(b.property);
				}
				return 0;
			});

			if (options.addCategoryComments) {
				rule.declarations = rule.declarations.reduce(
					(prev, curr) => {
						if (curr.type === 'declaration') {
							// Check if the category is different than the previous one
							const cat = category(curr.property);
							if (prev[1] !== cat) {
								// Check if there is already a comment for the category
								const prevDecl = prev[0].at(-1),
									categoryComment = ` ${cat
										.replace(/[A-Z]/g, (s) => ` ${s}`)
										.replace(/^./, (s) => s.toUpperCase())} `;

								if (!prevDecl || prevDecl.type !== 'comment' || prevDecl.comment !== categoryComment)
									// Add it if it does not exists
									prev[0].push({
										type: 'comment',
										comment: categoryComment,
										position: curr.position,
									} as css.Comment);

								prev[1] = cat;
							}
						}

						prev[0].push(curr);
						return prev;
					},
					[[], null] as [(css.Declaration | css.Comment)[], string | null]
				)[0];
			}
		}
	});

	const str =
		css.stringify(cssObj, {
			indent: (indent.character as string).repeat(indent.size),
		}) + (input.endsWith('\n') ? '\n' : '');

	if (outputConfig === 'string' || outputConfig.type === 'string') return str as any;
	else fs.writeFileSync(outputConfig.path, str);
}
