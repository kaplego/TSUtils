import * as readline from 'readline';

interface CommandArgument {
	mandatory: boolean;
	completer: (arg: string) => string[];
}
interface CommandFlag {
	name: string;
	short: string;
}
interface Command {
	name: string;
	aliases?: string[];
	arguments?: CommandArgument[];
	flags?: CommandFlag[];
}
export type OnCommandCallback = (
	readline: readline.Interface,
	command: Command,
	args: string[],
	flags?: string[]
) => Promise<unknown>;

/**
 * An interactive console in the terminal.
 */
export default class InteractiveConsole {
	public readonly prompt: string;
	public readonly commands: Command[] = [];
	private readonly onCommand: OnCommandCallback;
	private readonly readline: readline.Interface;
	private started = false;

	constructor(prompt: string, commands: Command[], onCommand: OnCommandCallback) {
		this.commands = commands;
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
					const command = this.getCommand(cmd);
					if (command !== null && argIndex <= this.getCommandArgCount(command)[0])
						return [command.arguments?.[argIndex]?.completer(currentArg).slice(0, 100) ?? [], currentArg];
					else return [[], line];
				}
			}) as readline.Completer,
		});
	}

	init(message: string) {
		if (this.started) throw new Error('Console already initiated.');

		this.started = true;

		this.commands.forEach((command) => {
			command.arguments?.reduce((prev, cur) => {
				if (prev === false && cur.mandatory === true)
					throw new Error(
						`Cannot have mandatory arguments after optional arguments. (reading command '${command}')`
					);
				return cur.mandatory;
			}, true);
		});

		console.clear();
		console.log(message);
		this.readline.setPrompt(this.prompt);
		this.readline.prompt();
		this.readline.on('line', async (rawInp) => {
			const inp = rawInp.trim().toLowerCase();
			const commandName = inp.split(' ')[0],
				args = inp.split(' ').slice(1);
			this.readline.pause();

			const command = this.getCommand(commandName);

			if (!command) {
				console.log(`Command '${commandName}' does not exists.`);
				this.readline.prompt();
				return;
			}

			const commandArgs = this.getCommandArgCount(command);

			if (args.length < commandArgs[0] || args.length > commandArgs[1]) {
				console.log(`Expected ${commandArgs.join('-')} argument(s), ${args.length} given.`);
				this.readline.prompt();
				return;
			}
			await this.onCommand(this.readline, command, args);
			this.readline.prompt();
		});
	}

	getCommand(input: string): Command | null {
		for (const command of this.commands)
			if (command.name === input || command.aliases?.includes(input)) return command;
		return null;
	}

	getCommandArgCount(command: Command): [number, number] {
		let min = 0,
			max = 0;

		command.arguments?.forEach((arg) => {
			if (arg.mandatory === true) {
				min++;
				max++;
			} else max++;
		});

		return [min, max];
	}

	listCommandNames(startsWith?: string): string[] {
		const result = [];
		for (const command of this.commands) {
			if (!startsWith) result.push(command.name, ...(command.aliases ?? []));
			else result.push(...[command.name, ...(command.aliases ?? [])].filter((c) => c.startsWith(startsWith)));
		}
		return result;
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
