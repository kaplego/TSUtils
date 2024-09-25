import InteractiveConsole, { Command } from './InteractiveConsole';

const ic = new InteractiveConsole('console'.yellow + ' > '.reset, (_rl, cmd, args, flags) => {
	return new Promise<void>((r) => {
		switch (cmd.name) {
			case 'test':
				console.log(args);
				console.log(flags);
				r();
				break;
		}
	});
});

ic.commands.add(
	new Command(
		'test',
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
				short: 't'
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
