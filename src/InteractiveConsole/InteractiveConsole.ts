import * as readline from 'readline';

const REGEXP_NAME = new RegExp(/^[a-z][a-z0-9-_]{0,31}$/);
const REGEXP_FLAG_NAME = new RegExp(/^[a-zA-Z][a-zA-Z0-9-_]{0,31}$/);
const REGEXP_FLAG_SHORT = new RegExp(/^[a-zA-Z]$/);

interface ICommandArgument {
	isMandatory: boolean;
	completer: (arg: string) => string[];
}
interface ICommandFlag {
	name: string;
	short?: string;
}

class CommandManager {
	private _commands: Command[] = [];
	private _freezed: boolean = false;

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
		if (this._freezed) throw new Error('Cannot add commands while CommandManager is freezed.');
		if (this.nameExists(command.name)) throw new CommandError(command, 'Command name already exists.');
		this._commands.push(command);
		return this;
	}

	public remove(filter: (command: Command, index: number) => boolean) {
		if (this._freezed) throw new Error('Cannot remove commands while CommandManager is freezed.');
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

	public freeze() {
		this._freezed = true;
	}
}

export class Command {
	public readonly name: string;
	private _aliases: string[];
	private _arguments: ICommandArgument[];
	private _flags: ICommandFlag[];

	constructor(name: string, args?: ICommandArgument[], flags?: ICommandFlag[], aliases?: string[]) {
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
				throw new CommandError(this, `Flag short '${flag.name}' does not match ${REGEXP_FLAG_SHORT.source}.`);

			if (prev.includes(flag.name) || (flag.short && prev.includes(flag.short)))
				throw new CommandError(this, `Flag ${flag.name} is declared twice.`);

			return flag.short ? [...prev, flag.name, flag.short] : [...prev, flag.name];
		}, []);
		this._flags = flags ?? [];
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

	public hasFlag(flag: string, includeShorts: boolean = false) {
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

export type OnCommandCallback = (
	readline: readline.Interface,
	command: Command,
	args: string[],
	flags?: ICommandFlag[]
) => Promise<unknown>;

/**
 * An interactive console in the terminal.
 */
export default class InteractiveConsole {
	public readonly prompt: string;
	public readonly commands: CommandManager;
	private readonly onCommand: OnCommandCallback;
	private readonly readline: readline.Interface;
	private started = false;

	constructor(prompt: string, onCommand: OnCommandCallback) {
		this.commands = new CommandManager();
		this.onCommand = onCommand;
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

			const inp = rawInp.trim().toLowerCase();
			const allArgs = this.parseCommand(inp);
			const commandName = allArgs.shift();

			const command = this.commands.findByName(commandName, true);

			if (!command) {
				console.log(`Command '${commandName}' does not exists.`);
				this.readline.prompt();
				return;
			}

			const flags = [],
				args = [];

			for (const arg of allArgs) {
				if (arg.startsWith('--')) {
					if (!command.hasFlag(arg.slice(2))) {
						console.log(`Unknown flag '${arg.slice(2)}'`);
						this.readline.prompt();
						return;
					}
					flags.push(arg.slice(2));
				} else if (arg.startsWith('-')) {
					for (const shortArg of arg.slice(1))
					{
						if (!command.hasFlag(shortArg, true)) {
							console.log(`Unknown flag '${shortArg}'`);
							this.readline.prompt();
							return;
						}
						flags.push(shortArg);
					}
				} else args.push(arg);
			}

			const commandArgs = command.argumentCount;

			if (args.length < commandArgs[0] || args.length > commandArgs[1]) {
				console.log(
					`Expected ${
						commandArgs[0] === commandArgs[1] ? commandArgs[0] : commandArgs.join('-')
					} argument(s), ${args.length} given.`
				);
				this.readline.prompt();
				return;
			}
			await this.onCommand(
				this.readline,
				command,
				args,
				flags.map((f) => command.flags.find((flag) => flag.name === f || flag.short === f))
			);
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
		const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
		let match: any[];
		const args = [];
	
		while ((match = regex.exec(command)) !== null) {
			args.push(match[1] || match[2] || match[0]);
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
