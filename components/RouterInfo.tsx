'use client';
import { getRouterInfo } from '@/app/api/routers/info/route';
import { Routers } from '@/lib/server/router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { secondsToHumanReadable } from '@/lib/utils';
import { RouterPicker } from './RouterPicker';
import { RouterIcon, ServerIcon } from 'lucide-react';

export function RouterInfo() {
	const [activeRouter, setActiveRouter] = useState<string | undefined>(
		undefined
	);
	const allRouters = useQuery({
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
		refetchOnWindowFocus: false,
		refetchOnMount: false
	});

	useEffect(() => {
		if (allRouters.data) {
			const savedRouter = localStorage.getItem('activeRouter');
			const savedRuterIsValid = allRouters.data.find(
				(router) => router.displayName === savedRouter
			);
			if (savedRouter && savedRuterIsValid) {
				setActiveRouter(savedRouter);
			} else {
				setActiveRouter(allRouters.data[0].displayName);
			}
		}
	}, [allRouters.dataUpdatedAt]);

	const routerInfo = useQuery({
		queryKey: ['getRouterInfo', activeRouter],
		queryFn: async () => {
			if (!activeRouter) {
				throw new Error('No routers found');
			}
			const response = await fetch(
				`/api/routers/info?displayName=${activeRouter}`
			);
			const data = (await response.json()) as getRouterInfo;
			if (!data.success) {
				throw new Error(data.error);
			}
			return data.data;
		},
		enabled: activeRouter !== undefined
	});

	if (routerInfo.isLoading || allRouters.isLoading) {
		return <LoadingError activeRouter={activeRouter} />;
	}

	if (routerInfo.isError || allRouters.isError) {
		return (
			<LoadingError
				error={
					routerInfo.error?.message ||
					allRouters.error?.message ||
					'Somthing went wrong'
				}
			/>
		);
	}

	return (
		<Card className="w-full">
			<CardHeader>
				<div className="flex h-4 w-full items-center justify-between">
					<h3 className="text-lg font-semibold">
						<ServerIcon className="mb-1 mr-2 inline-block" />
						Router Info
					</h3>
					{allRouters.data && (
						<RouterPicker
							allRouters={allRouters.data}
							activeDevice={activeRouter}
							setActiveDevice={setActiveRouter}
						/>
					)}
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-3 text-sm">
					{routerInfo.data && (
						<>
							<div className="flex w-full items-center gap-2">
								<span className="text-muted-foreground w-2/4">Model Name:</span>
								<span className="ml-auto overflow-hidden text-ellipsis whitespace-nowrap ">
									{routerInfo.data.model}
								</span>
							</div>
							<div className="flex w-full items-center gap-2 text-sm">
								<span className="text-muted-foreground w-1/4">Uptime</span>
								<span className="ml-auto ">
									{secondsToHumanReadable(routerInfo.data.uptime)}
								</span>
							</div>
							<div className="flex w-full items-center gap-2">
								<span className="text-muted-foreground w-1/4">Load Avg:</span>
								<span className="ml-auto ">
									{routerInfo.data.load
										.map((load) => `${(Number(load) / 65535).toFixed(2)}`)
										.join(', ')}
								</span>
							</div>
							<div className="flex w-full items-center gap-2">
								<span className="text-muted-foreground w-2/4">
									Free Memory:
								</span>
								<span className="ml-auto ">
									{(
										Number(routerInfo.data.memory.available) /
										1024 /
										1024
									).toFixed(0)}{' '}
									MB
								</span>
							</div>
						</>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function LoadingError({
	error,
	activeRouter
}: {
	error?: string;
	activeRouter?: string;
}) {
	return (
		<Card className="w-full">
			<CardHeader>
				<div className="flex h-4 w-full items-center justify-between">
					<h3 className="text-lg font-semibold">
						<ServerIcon className="mb-1 mr-2 inline-block" />
						Router Info
					</h3>
					<button className="border-1 flex w-fit items-center justify-center gap-1.5 rounded-md border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-white hover:bg-neutral-700">
						<RouterIcon className="inline-block h-4 w-4" />
						<span className="text-muted-foreground text-sm">
							{activeRouter || 'Select Router'}
						</span>
					</button>
				</div>
			</CardHeader>
			<CardContent>
				{error ? (
					<div className="space-y-3 text-sm">
						<div className="flex w-full items-center gap-2">
							<span className="text-muted-foreground w-1/4">Error:</span>
							<span className="ml-auto ">{error}</span>
						</div>
					</div>
				) : (
					<div className="space-y-3 text-sm">
						<div className="flex w-full items-center gap-2">
							<span className="text-muted-foreground w-1/4">Model Name:</span>
							<span className="ml-auto ">- - - -</span>
						</div>
						<div className="flex w-full items-center gap-2 text-sm">
							<span className="text-muted-foreground w-1/4">Uptime</span>
							<span className="ml-auto ">- - - -</span>
						</div>
						<div className="flex w-full items-center gap-2">
							<span className="text-muted-foreground w-1/4">Load Avg:</span>
							<span className="ml-auto ">- - - -</span>
						</div>
						<div className="flex w-full items-center gap-2">
							<span className="text-muted-foreground w-2/4">Free Memory:</span>
							<span className="ml-auto ">- - - -</span>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
