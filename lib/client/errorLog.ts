import util from 'util';

export function logError(error: { [key: string]: any }) {
	console.log(util.inspect(error, { depth: null, colors: true }));
}
