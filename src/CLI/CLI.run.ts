import CLI, { Command } from './CLI';

const cli = new CLI('cli'.yellow + ' > '.reset);

cli.commands
	.add(
		new Command(
			'test',
			(_ic, args, flags) => {
				console.log(args);
				console.log(flags);
			},
			[
				{
					name: 'Movie',
					description: null,
					isMandatory: true,
					completer(arg) {
						return ['TPM', 'AOTC', 'ROTS', 'ANH', 'TESB', 'ROTJ', 'Solo', 'RogueOne'].filter((film) =>
							film.toLowerCase().startsWith(arg.toLowerCase())
						);
					},
				},
			],
			[
				{
					name: 'test1',
					isValueFlag: false,
					short: 't',
				},
				{
					name: 'hello',
					isValueFlag: true,
					short: 's',
				},
			]
		)
	);

cli.init(' Command-Line Interface '.bgBlue.white + '\n'.reset);
