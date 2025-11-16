import util from 'util';

export function logError(error: { [key: string]: any }) {
	console.log(
		util.inspect(
			{
				timestamp: new Date().toISOString(),
				...error
			},
			{ depth: null, colors: true }
		)
	);
}
