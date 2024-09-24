import 'colors';
import InteractiveConsole from './InteractiveConsole';

const ic = new InteractiveConsole(
	'console'.yellow + ' > '.reset,
	[
		{
			name: 'test',
			aliases: ['t'],
			arguments: [
				{
					mandatory: true,
					completer(arg) {
						return ['The Phantom Menace', 'Attack Of The Clones', 'Revenge Of The Sith'].filter((f) =>
							f.toLowerCase().startsWith(arg.toLowerCase())
						);
					},
				},
			],
		},
	],
	(_rl, cmd, args) => {
		return new Promise<void>((r) => {
			switch (cmd.name) {
				case 'test':
					console.log(...args);
					r();
					break;
			}
		});
	}
);

ic.init(' Interactive Console '.bgBlue.white + '\n'.reset);
