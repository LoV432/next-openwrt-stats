'use client';

import { useEffect, useRef, useState } from 'react';

export type EventSourceStatus = 'idle' | 'connecting' | 'open' | 'closed';

/**
 * Minimal typed EventSource wrapper. Opens when `enabled` is true, closes on
 * unmount or when disabled — closing the connection tears down the capture on
 * the server (the request aborts). `onEvent` is called for every named event.
 */
export function useEventSource({
	url,
	enabled,
	onEvent
}: {
	url: string;
	enabled: boolean;
	onEvent: (event: string, data: unknown) => void;
}) {
	const [status, setStatus] = useState<EventSourceStatus>('idle');
	const onEventRef = useRef(onEvent);
	onEventRef.current = onEvent;

	useEffect(() => {
		if (!enabled) {
			setStatus('idle');
			return;
		}

		setStatus('connecting');
		const es = new EventSource(url);
		let opened = false;

		es.onopen = () => {
			opened = true;
			setStatus('open');
		};

		const names = ['meta', 'packet', 'stat', 'error', 'end'];
		const handlers: Record<string, (e: MessageEvent) => void> = {};
		for (const name of names) {
			const handler = (e: MessageEvent) => {
				let data: unknown = undefined;
				try {
					data = e.data ? JSON.parse(e.data) : undefined;
				} catch {
					data = e.data;
				}
				onEventRef.current(name, data);
				if (name === 'end') {
					es.close();
					setStatus('closed');
				}
			};
			handlers[name] = handler;
			es.addEventListener(name, handler as EventListener);
		}

		es.onerror = () => {
			// The browser auto-reconnects on transient errors; only surface a
			// hard failure if we never managed to open.
			if (!opened) setStatus('closed');
		};

		return () => {
			for (const name of names) {
				es.removeEventListener(name, handlers[name] as EventListener);
			}
			es.close();
			setStatus('closed');
		};
	}, [url, enabled]);

	return { status };
}
