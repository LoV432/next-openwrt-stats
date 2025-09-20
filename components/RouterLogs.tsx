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
// import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Routers } from '@/lib/server/router';
import { useEffect, useState } from 'react';
import type { RouterLogs } from '@/app/api/routers/info/logs/route';

export function RouterLogs() {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedRouter, setSelectedRouter] = useState<string | undefined>(
		undefined
	);
	// const logsByRouter = useRef<{
	// 	[key: string]: {
	// 		logs: {
	// 			id: string;
	// 			timestamp: string;
	// 			level: string;
	// 			message: string;
	// 			source: string;
	// 			facility: string;
	// 		}[];
	// 		lastLog: string;
	// 	};
	// }>({});
	// const [rerender, setRerender] = useState(false);
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

	// useEffect(() => {
	// 	if (routerLogs.data && selectedRouter) {
	// 		parseAndPushLogs(routerLogs.data, selectedRouter);
	// 	}
	// }, [routerLogs.dataUpdatedAt]);

	// function parseAndPushLogs(logs: string[], router: string) {
	// 	if (!logsByRouter.current[router]) {
	// 		logsByRouter.current[router] = {
	// 			logs: [],
	// 			lastLog: ''
	// 		};
	// 	}
	// 	const lastLogIndex = logs.findIndex(
	// 		(log) => log.trim() === logsByRouter.current[router].lastLog.trim()
	// 	);
	// 	// console.log(lastLogIndex, 'lastLogIndex');
	// 	let newLogs: string[] = logs;
	// 	if (lastLogIndex !== -1) {
	// 		newLogs = logs.slice(lastLogIndex + 1);
	// 	}
	// 	// console.log(newLogs, 'newLogs');
	// 	for (const logLine of newLogs) {
	// 		const parts = logLine.split(' ');
	// 		const timestamp = parts.slice(0, 5).join(' ');
	// 		const facilityLevel = parts[5];
	// 		const message = parts.slice(6).join(' ');

	// 		const level = facilityLevel.split('.')[1]?.toUpperCase() || 'INFO';
	// 		const daemon = message.split(':')[0] || 'system';
	// 		logsByRouter.current[router].logs.push({
	// 			id: logLine.replace(/\n/g, '') + Math.random(),
	// 			timestamp,
	// 			level,
	// 			message,
	// 			source: daemon,
	// 			facility: facilityLevel
	// 		});
	// 	}
	// 	logsByRouter.current[router].lastLog = logs[logs.length - 1].trim();
	// 	logsByRouter.current[router].logs =
	// 		logsByRouter.current[router].logs.slice(-500);
	// 	// console.log(logsByRouter.current[router].logs.length);
	// 	setRerender(!rerender);
	// 	return true;
	// }

	// console.log('rerender', rerender);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<div>
					<Button variant="outline" className="hidden md:flex">
						<FileText className="h-4 w-4" />
						Logs
					</Button>
					<Button
						variant="ghost"
						className="border-accent w-full justify-start rounded-none border-b-2 pb-4 pt-0 md:hidden"
					>
						<FileText className="h-4 w-4" />
						Logs
					</Button>
				</div>
			</DialogTrigger>
			<DialogContent className="h-[95vh] w-[90vw] border-neutral-800 bg-neutral-900 sm:max-w-[1200px]">
				<DialogHeader>
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
							<SelectContent className="border-neutral-700 bg-neutral-800">
								{routers?.data?.map((router) => (
									<SelectItem
										key={router.displayName}
										value={router.displayName}
										className="text-white hover:bg-neutral-700"
									>
										{router.displayName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* <ScrollArea className="h-[calc(95vh-160px)] w-full rounded-md border border-neutral-800 bg-black p-4">
						<div className="space-y-2">
							{logsByRouter.current?.[selectedRouter || '']?.logs
								.toReversed()
								.map((log) => (
									<div
										key={log.id}
										className="flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-neutral-900"
										style={{ contentVisibility: 'auto' }}
									>
										<Badge
											variant="outline"
											className={`font-mono text-xs ${getLogLevelStyle(log.level)} my-auto w-20`}
										>
											{log.level}
										</Badge>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2 text-xs text-neutral-500">
												<span className="font-mono">{log.timestamp}</span>
												<span>•</span>
												<span>{log.source}</span>
											</div>
											<p className="mt-1 font-mono text-sm text-white">
												{log.message}
											</p>
										</div>
									</div>
								))}
						</div>
					</ScrollArea> */}
					<div className="h-[calc(95vh-160px)] overflow-x-scroll rounded-md border border-neutral-800 bg-black">
						<pre className="overflow-y-scroll p-4">{routerLogs.data}</pre>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// function getLogLevelStyle(level: string) {
// 	switch (level.toUpperCase()) {
// 		case 'ERR':
// 		case 'ERROR':
// 			return 'text-red-400 bg-red-950 border-red-800';
// 		case 'WARN':
// 		case 'WARNING':
// 			return 'text-yellow-400 bg-yellow-950 border-yellow-800';
// 		case 'INFO':
// 			return 'text-blue-400 bg-blue-950 border-blue-800';
// 		case 'NOTICE':
// 			return 'text-green-400 bg-green-950 border-green-800';
// 		case 'DEBUG':
// 			return 'text-gray-400 bg-gray-950 border-gray-800';
// 		default:
// 			return 'text-neutral-400 bg-neutral-950 border-neutral-800';
// 	}
// }
