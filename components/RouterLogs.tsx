'use client';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { List, RowComponentProps } from 'react-window';
import { FileText, LoaderCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Routers } from '@/lib/server/router';
import { useEffect, useRef, useState } from 'react';
import type { RouterLogs } from '@/app/api/routers/info/logs/route';

export function RouterLogs() {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedRouter, setSelectedRouter] = useState<string | undefined>(
		undefined
	);
	const logsByRouter = useRef<{
		[key: string]: {
			logs: {
				id: string;
				timestamp: string;
				level: string;
				message: string;
				source: string;
				facility: string;
			}[];
			lastLog: string;
		};
	}>({});
	const [rerender, setRerender] = useState(false);
	const routers = useQuery({
		queryKey: ['getRouters'],
		queryFn: async () => {
			const response = await fetch('/api/routers/all');
			const data = (await response.json()) as Routers;
			if (!data.success) {
				throw new Error(data.error);
			}
			if (!data.data || data.data.length === 0) {
				throw new Error('No routers found');
			}
			return data.data;
		},
		enabled: isOpen,
		refetchOnWindowFocus: false,
		refetchOnMount: false
	});

	useEffect(() => {
		if (routers.data && selectedRouter === undefined) {
			setSelectedRouter(routers.data[0].displayName);
		}
	}, [routers.dataUpdatedAt]);

	const routerLogs = useQuery({
		queryKey: ['getRouterLogs', selectedRouter],
		queryFn: async () => {
			if (!selectedRouter) {
				throw new Error('No routers found');
			}
			const response = await fetch(
				`/api/routers/info/logs?displayName=${selectedRouter}`
			);
			const data = (await response.json()) as RouterLogs;
			if (!data.success) {
				throw new Error(data.error);
			}
			return data.data;
		},
		enabled: isOpen && selectedRouter !== undefined,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		refetchInterval: 10000
	});

	useEffect(() => {
		if (routerLogs.data && selectedRouter) {
			parseAndPushLogs(routerLogs.data, selectedRouter);
		}
	}, [routerLogs.dataUpdatedAt]);

	function parseAndPushLogs(logs: string[], router: string) {
		if (!logsByRouter.current[router]) {
			logsByRouter.current[router] = {
				logs: [],
				lastLog: ''
			};
		}
		const lastLogIndex = logs.findIndex(
			(log) => log.trim() === logsByRouter.current[router].lastLog.trim()
		);
		let newLogs: string[] = logs;
		if (lastLogIndex !== -1) {
			newLogs = logs.slice(lastLogIndex + 1);
		}
		for (const logLine of newLogs) {
			const parts = logLine.split(' ');
			const timestamp = parts.slice(0, 5).join(' ');
			const facilityLevel = parts[5];
			const messageWithDaemon = parts.slice(6).join(' ').split(':');
			const message = messageWithDaemon.slice(1).join(':');
			const daemon = messageWithDaemon[0] || 'system';

			const level = facilityLevel.split('.')[1]?.toUpperCase() || 'INFO';
			logsByRouter.current[router].logs.push({
				id: logLine.replace(/\n/g, '') + Math.random(),
				timestamp,
				level,
				message,
				source: daemon,
				facility: facilityLevel
			});
		}
		logsByRouter.current[router].lastLog = logs[logs.length - 1].trim();
		setRerender(!rerender);
		return true;
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<div>
					<Button variant="outline" className="hidden md:flex">
						<FileText className="h-4 w-4" />
						Logs
					</Button>
					<button className="flex w-full items-center justify-start gap-2 rounded-none border-b-2 p-2 md:hidden">
						<FileText className="h-4 w-4" />
						Logs
					</button>
				</div>
			</DialogTrigger>
			<DialogContent className="h-[95dvh] w-[90vw] border-neutral-800 bg-neutral-900 px-2 sm:max-w-[1200px] sm:px-6">
				<DialogHeader className="px-4 sm:px-0">
					<DialogTitle className="flex items-center gap-2 text-white">
						<FileText className="h-5 w-5" />
						System Logs
					</DialogTitle>
				</DialogHeader>
				<div className="w-full space-y-4 overflow-hidden">
					<div className="flex items-center gap-2">
						<Select
							value={selectedRouter}
							onValueChange={(value) => setSelectedRouter(value)}
						>
							<SelectTrigger className="ml-auto w-40 border-neutral-700 bg-neutral-800 text-white">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{routers?.data?.map((router) => (
									<SelectItem
										key={router.displayName}
										value={router.displayName}
									>
										{router.displayName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="h-[calc(95dvh-160px)] w-full overflow-scroll rounded-md border border-neutral-800 bg-black">
						{selectedRouter &&
						logsByRouter.current[selectedRouter]?.logs.length ? (
							<List
								rowCount={logsByRouter.current[selectedRouter]?.logs.length}
								overscanCount={20}
								rowHeight={55}
								rowProps={{
									logs: logsByRouter.current[selectedRouter].logs
								}}
								rowComponent={Log}
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center">
								<LoaderCircle className="h-12 w-12 animate-spin" />
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function Log({
	index,
	logs,
	style
}: RowComponentProps<{
	logs: {
		id: string;
		timestamp: string;
		level: string;
		message: string;
		source: string;
		facility: string;
	}[];
}>) {
	const log = logs[logs.length - index - 1];
	return (
		<div
			key={log.id}
			className="flex items-start gap-3 p-2 transition-colors hover:bg-neutral-900"
			style={style}
		>
			<div
				className={`font-mono text-xs ${getLogLevelStyle(log.level)} my-auto h-4 w-4 rounded-full`}
			></div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2 text-xs text-neutral-500">
					<span className="font-mono">{log.timestamp}</span>
					<span>•</span>
					<span>{log.source}</span>
				</div>
				<p className="mt-1 whitespace-nowrap font-mono text-sm text-white">
					{log.message}
				</p>
			</div>
		</div>
	);
}

function getLogLevelStyle(level: string) {
	switch (level.toUpperCase()) {
		case 'ERR':
		case 'ERROR':
			return 'text-red-400 bg-red-950 border-red-800';
		case 'WARN':
		case 'WARNING':
			return 'text-yellow-400 bg-yellow-950 border-yellow-800';
		case 'INFO':
			return 'text-blue-400 bg-blue-950 border-blue-800';
		case 'NOTICE':
			return 'text-green-400 bg-green-950 border-green-800';
		case 'DEBUG':
			return 'text-gray-400 bg-gray-950 border-gray-800';
		default:
			return 'text-neutral-400 bg-neutral-950 border-neutral-800';
	}
}
