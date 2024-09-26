import InteractiveConsole, { Command } from './InteractiveConsole';

const ic = new InteractiveConsole('console'.yellow + ' > '.reset);

ic.commands
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
					name: 'salut',
					isValueFlag: true,
					short: 's',
				},
			]
		)
	);

ic.init(' Interactive Console '.bgBlue.white + '\n'.reset);
