import 'server-only';
import { Client, type ClientChannel } from 'ssh2';
import { getRouter } from './router';
import { logError } from '../client/errorLog';

export type SshExecHandle = {
	stream: ClientChannel;
	stop: () => void;
};

/**
 * Open an ssh2 password-auth connection to a registered router and exec a
 * command, streaming its stdout via `onStdout`. Resolves once the channel is
 * open. Honors an AbortSignal so the request lifecycle (dialog close) tears
 * everything down.
 */
export async function withSshExec({
	displayName,
	command,
	onStdout,
	onStderr,
	onClose,
	signal
}: {
	displayName: string;
	command: string;
	onStdout: (chunk: Buffer) => void;
	onStderr?: (chunk: Buffer) => void;
	onClose?: (code: number | null) => void;
	signal?: AbortSignal;
}): Promise<SshExecHandle> {
	const router = await getRouter(displayName);
	if (!router.success) {
		throw new Error(router.errorMessage);
	}

	const host = router.data.routerIP
		.replace(/^https?:\/\//, '')
		.replace(/:\d+$/, '');

	return new Promise<SshExecHandle>((resolve, reject) => {
		const conn = new Client();
		let settled = false;

		const stop = () => {
			try {
				conn.end();
			} catch {}
		};

		if (signal) {
			if (signal.aborted) {
				stop();
				reject(new Error('Aborted'));
				return;
			}
			signal.addEventListener('abort', stop, { once: true });
		}

		conn.on('ready', () => {
			// No PTY: a PTY corrupts the binary pcap on stdout (plan §2.3).
			conn.exec(command, { pty: false }, (err, stream) => {
				if (err) {
					settled = true;
					stop();
					reject(err);
					return;
				}
				stream.on('data', onStdout);
				stream.stderr.on('data', (chunk: Buffer) => onStderr?.(chunk));
				stream.on('close', (code: number | null) => {
					onClose?.(code);
					stop();
				});
				settled = true;
				resolve({ stream, stop });
			});
		});

		conn.on('error', (err) => {
			if (!settled) {
				settled = true;
				reject(err);
			} else {
				logError({
					displayName,
					errorMessage: 'SSH connection error after exec',
					error: err
				});
			}
		});

		const privateKey = router.data.privateKey?.trim();
		conn.connect({
			host,
			port: 22,
			username: router.data.username,
			...(privateKey ? { privateKey } : { password: router.data.password }),
			readyTimeout: 15000,
			keepaliveInterval: 10000
		});
	});
}

/**
 * Best-effort kill of a lingering capture via a throwaway connection, using
 * the pid file the wrapped command wrote. Used as a safety net on
 * teardown in case the primary channel's close didn't stop tcpdump.
 */
export async function sshKillPidFile({
	displayName,
	pidFile
}: {
	displayName: string;
	pidFile: string;
}): Promise<void> {
	try {
		const handle = await withSshExec({
			displayName,
			// pidFile is a server-generated /tmp path (no user input) — safe.
			command: `kill $(cat ${pidFile} 2>/dev/null) 2>/dev/null; rm -f ${pidFile}`,
			onStdout: () => {}
		});
		// Give it a moment, then close.
		setTimeout(() => handle.stop(), 1000);
	} catch (error) {
		logError({ displayName, errorMessage: 'sshKillPidFile failed', error });
	}
}
