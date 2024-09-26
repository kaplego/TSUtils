import { bold } from 'colors';
import * as readline from 'readline';

const REGEXP_NAME = new RegExp(/^[a-z][a-z0-9-_]{0,31}$/);
const REGEXP_FLAG_NAME = new RegExp(/^[a-zA-Z][a-zA-Z0-9-_]{0,31}$/);
const REGEXP_FLAG_SHORT = new RegExp(/^[a-zA-Z]$/);

interface ICommandArgument {
	name: string;
	description?: string;
	isMandatory: boolean;
	completer: (arg: string) => string[];
}

interface ICommandBaseFlag {
	name: string;
	isValueFlag: boolean;
	short?: string;
	description?: string;
}
interface ICommandFlag extends ICommandBaseFlag {
	isValueFlag: false;
}
interface ICommandValueFlag extends ICommandBaseFlag {
	name: string;
	isValueFlag: true;
}
type CommandAnyFlag = ICommandFlag | ICommandValueFlag;

type CommandResultArg = Map<string, string>;

type CommandResultFlag = Map<string, string | null>;

type CommandCallback = (
	interactiveConsole: InteractiveConsole,
	args: CommandResultArg,
	flags: CommandResultFlag
) => unknown | Promise<unknown>;

class CommandManager {
	private _commands: Command[] = [];
	private _frozen: boolean = false;

	private nameExists(name: string, includeAliases: boolean = true): boolean {
		for (const command of this._commands) {
			if (command.name === name || (includeAliases && command.hasAlias(name))) return true;
		}

		return false;
	}

	public list() {
		return [...this._commands];
	}

	public add(command: Command) {
		if (this._frozen) throw new Error('Cannot add commands while CommandManager is frozen.');
		if (this.nameExists(command.name)) throw new CommandError(command, 'Command name already exists.');
		this._commands.push(command);
		return this;
	}

	public remove(filter: (command: Command, index: number) => boolean) {
		if (this._frozen) throw new Error('Cannot remove commands while CommandManager is frozen.');
		this._commands = this._commands.filter((c, i) => filter(c, i));
		return this;
	}

	public removeByName(name: string) {
		return this.remove((command) => command.name === name);
	}

	public find(find: (command: Command, index: number) => boolean) {
		return this._commands.find((c, i) => find(c, i));
	}

	public findByName(name: string, includeAliases: boolean = false) {
		return this.find((command) => command.name === name || (includeAliases && command.hasAlias(name)));
	}

	public filter(filter: (command: Command, index: number) => boolean) {
		return this._commands.filter((c, i) => filter(c, i));
	}

	public freeze() {
		this._frozen = true;
	}
}

export class Command {
	public readonly name: string;
	private _aliases: string[];
	private _arguments: ICommandArgument[];
	private _flags: CommandAnyFlag[];
	public readonly callback: CommandCallback;
	public readonly description?: string;

	constructor(
		name: string,
		callback: CommandCallback,
		args?: ICommandArgument[],
		flags?: CommandAnyFlag[],
		aliases?: string[],
		description?: string
	) {
		if (!REGEXP_NAME.test(name))
			throw new CommandError(
				null,
				`Command name '${name}' does not match regular expression ${REGEXP_NAME.source}.`
			);
		this.name = name;

		aliases?.reduce<string[]>((prev, alias) => {
			if (!REGEXP_NAME.test(alias))
				throw new CommandError(
					this,
					`Command alias '${alias}' does not match regular expression ${REGEXP_NAME.source}.`
				);
			if (prev.includes(alias)) throw new CommandError(this, `Command alias '${alias}' is declared twice.`);
			return [...prev, alias];
		}, []);
		this._aliases = aliases ?? [];

		args?.reduce<boolean>((prev, arg, i) => {
			if (prev === false && arg.isMandatory)
				throw new CommandError(
					this,
					`Argument #${i} cannot be mandatory as there is optional arguments before.`
				);

			return arg.isMandatory;
		}, true);
		this._arguments = args ?? [];

		flags?.reduce<string[]>((prev, flag) => {
			if (!REGEXP_FLAG_NAME.test(flag.name))
				throw new CommandError(this, `Flag name '${flag.name}' does not match ${REGEXP_FLAG_NAME.source}.`);

			if (flag.short && !REGEXP_FLAG_SHORT.test(flag.short))
				throw new CommandError(this, `Flag short '${flag.short}' does not match ${REGEXP_FLAG_SHORT.source}.`);

			if (prev.includes(flag.name) || (flag.short && prev.includes(flag.short)))
				throw new CommandError(this, `Flag ${flag.name} is declared twice.`);

			return flag.short ? [...prev, flag.name, flag.short] : [...prev, flag.name];
		}, []);
		this._flags = flags ?? [];

		this.callback = callback;
		this.description = description;
	}

	public get aliases() {
		return [...this._aliases];
	}

	public hasAlias(alias: string) {
		return this._aliases.includes(alias);
	}

	public get arguments() {
		return [...this._arguments];
	}

	public get argumentCount(): [number, number] {
		let min = 0,
			max = 0;

		this.arguments.forEach((arg) => {
			if (arg.isMandatory === true) {
				min++;
				max++;
			} else max++;
		});

		return [min, max];
	}
	public get minArgumentCount() {
		return this.argumentCount[0];
	}
	public get maxArgumentCount() {
		return this.argumentCount[1];
	}

	public get flags() {
		return [...this._flags];
	}

	public getFlag(flag: string, includeShorts: boolean = false) {
		return this._flags.find((f) => f.name === flag || (includeShorts && f.short === flag));
	}
}

class CommandError extends Error {
	command: Command;

	constructor(command: Command | null, message?: string) {
		super(command === null ? message.red : `${message} (command '${command.name}')`.red);
		this.command = command;
	}
}

/**
 * An interactive console in the terminal.
 */
export default class InteractiveConsole {
	public readonly prompt: string;
	public readonly commands: CommandManager;
	private readonly readline: readline.Interface;
	private started = false;

	constructor(prompt: string) {
		const self = this;

		this.commands = new CommandManager();
		this.commands
			.add(
				new Command(
					'help',
					(_, args) => {
						const cmdArg = args.get('Command') ?? 'help';

						const command = this.commands.findByName(cmdArg, true);
						if (!command) return console.log(`Command '${cmdArg}' not found.`);

						console.log(bold(`\n  ${command.name}`));
						if (command.aliases && command.aliases.length > 0)
							console.log(`    Aliases: ${command.aliases.join(', ')}`.italic);
						console.log(`\n  ${command.description ?? 'No description'}`);

						if (command.arguments.length > 0) {
							console.log('\n\n  === Usage ===');
							console.log(
								`    ${command.name} ${command.arguments
									.map((a) => (a.isMandatory ? a.name : `[${a.name}]`))
									.join(' ')}`
							);

							console.log('\n\n  === Arguments ===');

							command.arguments.forEach((arg) => {
								console.log(bold(`\n  ${arg.name}`));
								console.log(`    ${arg.isMandatory ? 'Mandatory' : 'Optional'}`);
								console.log(`    ${arg.description ?? 'No description'}`);
							});
						}

						if (command.flags.length > 0) {
							console.log('\n\n  === Flags ===');

							command.flags.forEach((flag) => {
								console.log(bold(`\n  --${flag.name}`));
								if (flag.short) console.log(`    Alias: -${flag.short}`.italic);
								if (flag.isValueFlag) console.log('    Value flag');
								console.log(`    ${flag.description ?? 'No description'}`);
							});
						}

						console.log();
					},
					[
						{
							name: 'Command',
							description: 'The command for which to get help.',
							isMandatory: false,
							completer(arg) {
								return self.commands.list().reduce<string[]>((prev, command) => {
									if (command.name.startsWith(arg)) prev.push(command.name);
									prev.push(...command.aliases.filter((alias) => alias.startsWith(arg)));
									return prev;
								}, []);
							},
						},
					],
					[],
					['h', 'man'],
					'Returns command details, arguments and flags.'
				)
			)
			.add(
				new Command(
					'clear',
					() => {
						process.stdout.write('\x1Bc');
					},
					[],
					[],
					['cls'],
					'Clears the console'
				)
			);

		this.prompt = prompt;
		this.readline = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			completer: ((line) => {
				const args = line.split(' '),
					cmd = args[0],
					argIndex = args.length - 2,
					currentArg = args[args.length - 1];

				if (args.length === 0) return [this.listCommandNames(), line];
				else if (args.length === 1) return [this.listCommandNames(cmd), line];
				else {
					if (currentArg.startsWith('-')) return [[], line];
					const command = this.commands.findByName(cmd, true);
					if (command !== null && argIndex <= command.maxArgumentCount)
						return [command.arguments?.[argIndex]?.completer(currentArg).slice(0, 100) ?? [], currentArg];
					else return [[], line];
				}
			}) as readline.Completer,
		});
	}

	init(message: string) {
		if (this.started) throw new Error('Console already initiated.');
		this.started = true;

		this.commands.freeze();

		console.clear();
		console.log(message);
		this.readline.setPrompt(this.prompt);
		this.readline.prompt();
		this.readline.on('line', async (rawInp) => {
			this.readline.pause();

			const inp = rawInp.trim();
			const allArgs = this.parseCommand(inp);
			const commandName = allArgs.shift().toLowerCase();

			const command = this.commands.findByName(commandName, true);

			if (!command) {
				console.log(`Command '${commandName}' does not exists.`);
				this.readline.prompt();
				return;
			}

			const flags: Map<string, string | null> = new Map(),
				args: Map<string, string> = new Map();

			let previousValueFlag: ICommandValueFlag | null = null;
			for (const arg of allArgs) {
				if (arg.startsWith('--')) {
					if (previousValueFlag !== null) {
						console.log(
							`Missing value for flag '${previousValueFlag.name}'. ` +
								`Run \`help ${command.name}\` to list available flags.`
						);
						this.readline.prompt();
						return;
					}

					const flag = command.getFlag(arg.toLowerCase().slice(2));
					if (!flag) {
						console.log(
							`Unknown flag '${arg.slice(2)}'. ` + `Run \`help ${command.name}\` to list available flags.`
						);
						this.readline.prompt();
						return;
					}
					if (!flag.isValueFlag) flags.set(flag.name, null);
					else previousValueFlag = flag;
				} else if (arg.startsWith('-')) {
					if (previousValueFlag !== null) {
						console.log(
							`Missing value for flag '${previousValueFlag.name}'. ` +
								`Run \`help ${command.name}\` to list available flags.`
						);
						this.readline.prompt();
						return;
					}

					if (/-.=.*/.test(arg)) {
						const [flagName, value] = arg.slice(1).split('=', 2);
						const flag = command.getFlag(flagName, true);
						if (!flag) {
							console.log(
								`Unknown flag '${flagName}'. ` + `Run \`help ${command.name}\` to list available flags.`
							);
							this.readline.prompt();
							return;
						}

						flags.set(flag.name, value.replace(/^["']|["']$/g, ''));
					} else
						for (const flagName of arg.slice(1)) {
							const flag = command.getFlag(flagName, true);
							if (!flag) {
								console.log(
									`Unknown flag '${flagName}'. Run \`help ${command.name}\` to list available flags.`
								);
								this.readline.prompt();
								return;
							}

							if (!flag.isValueFlag) {
								flags.set(flag.name, null);
							} else {
								console.log(
									`Missing value for flag '${flagName}'. ` +
										`Run \`help ${command.name}\` to list available flags.`
								);
								this.readline.prompt();
								return;
							}
						}
				} else {
					if (previousValueFlag !== null) {
						flags.set(previousValueFlag.name, arg);
						previousValueFlag = null;
					} else args.set(command.arguments[args.size].name, arg);
				}
			}

			const commandArgs = command.argumentCount;

			if (args.size < commandArgs[0] || args.size > commandArgs[1]) {
				console.log(
					`Expected ${
						commandArgs[0] === commandArgs[1] ? commandArgs[0] : commandArgs.join('-')
					} argument(s), ${args.size} given. Run \`help ${command.name}\` to see command configuration.`
				);
				this.readline.prompt();
				return;
			}
			await command.callback(this, args, flags);
			this.readline.prompt();
		});
	}

	listCommandNames(startsWith?: string): string[] {
		return this.commands.list().reduce((prev, command) => {
			if (!startsWith) prev.push(command.name, ...(command.aliases ?? []));
			else prev.push(...[command.name, ...(command.aliases ?? [])].filter((c) => c.startsWith(startsWith)));
			return prev;
		}, []);
	}

	parseCommand(command: string): string[] {
		const regex = /(-[^"']=)?("([^"]*)"|'([^']*)'|(\S+))/g;
		let match: any[];
		const args = [];

		while ((match = regex.exec(command)) !== null) {
			args.push(match[0] ?? match[1] ?? match[2]);
		}

		return args;
	}

	pause() {
		this.readline.pause();
		console.log();
		console.log('- Terminal paused -');
	}

	resume() {
		console.log('- Terminal resumed -');
		this.readline.prompt();
	}
}
