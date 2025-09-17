'use client';
import { getRouterInfo } from '@/app/api/routers/info/route';
import { Routers } from '@/lib/server/routers';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { secondsToHumanReadable } from '@/lib/utils';
import { RouterPicker } from './RouterPicker';
import { ServerIcon } from 'lucide-react';

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
		if (allRouters.data && !activeRouter) {
			setActiveRouter(allRouters.data[1].routerIP);
		}
	}, [allRouters.data]);

	const routerInfo = useQuery({
		queryKey: ['getRouterInfo', activeRouter],
		queryFn: async () => {
			if (!activeRouter) {
				throw new Error('No routers found');
			}
			const response = await fetch(
				`/api/routers/info?routerIp=${activeRouter}`
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
		return <LoadingError />;
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

function LoadingError({ error }: { error?: string }) {
	return (
		<Card className="w-full">
			<CardHeader>
				<div className="flex h-4 w-full items-center justify-between">
					<h3 className="text-lg font-semibold">
						<ServerIcon className="mb-1 mr-2 inline-block" />
						Router Info
					</h3>
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
