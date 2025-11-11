'use client';

import { Button } from './ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from './ui/dialog';
import { Card } from './ui/card';
import { useQuery } from '@tanstack/react-query';
import { PbrInterfaces, PbrPolicy } from '@/lib/server/pbr';
import { deletePBRPolicyAction } from '@/lib/server/pbrActions';
import { SVGIcon } from './SVGIcons';
import { AddEditRule } from './AddPBRPolicy';
import { toast } from 'sonner';
import { useState } from 'react';
import { LoaderCircle, ShieldIcon, Trash2Icon } from 'lucide-react';

function Field({ label, value }: { label: string; value: string }) {
	const values = value.split(' ').map((v) => {
		if (
			v.startsWith(
				'https://raw.githubusercontent.com/LoV432/pta-block/refs/heads/master/domains/'
			)
		) {
			return (
				<div className="h-6 w-6 fill-white" key={v}>
					<SVGIcon iconName={v.split('/')[v.split('/').length - 1]} />
				</div>
			);
		}
		return <div key={v}>{v}</div>;
	});
	return (
		<div className="flex flex-col gap-1">
			<div className="text-muted-foreground text-sm font-medium">{label}:</div>
			<div className="group relative">
				<div
					className={`flex flex-wrap gap-3 break-all text-left text-sm ${
						value.includes('LoV432') ? 'mt-1' : ''
					}`}
				>
					{values}
				</div>
			</div>
		</div>
	);
}

export function PBRInfo() {
	const [isOpen, setIsOpen] = useState(false);
	const {
		data,
		refetch: refetchPolicies,
		isLoading
	} = useQuery({
		queryKey: ['pbrPolicy'],
		queryFn: async () => {
			const pbrData = await fetch('/api/pbr/pbr-policy').then(
				(res) => res.json() as Promise<PbrPolicy>
			);
			if (!pbrData.success) {
				throw new Error(pbrData.errorMessage);
			}
			return pbrData.data;
		},
		enabled: isOpen
	});

	const { data: interfaces } = useQuery({
		queryKey: ['pbrInterfaces'],
		queryFn: async () => {
			const pbrData = await fetch('/api/pbr/pbr-interfaces').then(
				(res) => res.json() as Promise<PbrInterfaces>
			);
			if (!pbrData.success) throw new Error(pbrData.errorMessage);
			return pbrData.data;
		},
		enabled: isOpen
	});

	const policies = Object.values(data || {})
		.map((policy) => {
			if (policy['.type'] === 'policy') {
				return policy;
			}
			return null;
		})
		.filter((policy) => policy !== null);
	const config = Object.values(data || {})
		.map((policy) => {
			if (policy['.type'] === 'pbr') {
				return policy;
			}
			return null;
		})
		.filter((policy) => policy !== null);
	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<div>
					<Button variant="outline" className="hidden md:flex">
						<ShieldIcon className="h-4 w-4" />
						Policy Based Routing
					</Button>
					<button className="flex w-full items-center justify-start gap-2 rounded-none border-b-2 p-2 md:hidden">
						<ShieldIcon className="h-4 w-4" />
						Policy Based Routing
					</button>
				</div>
			</DialogTrigger>
			<DialogContent className="flex h-full max-h-[80vh] w-[90vw] max-w-3xl flex-col overflow-hidden">
				<DialogHeader>
					<DialogTitle>Policy Based Routing</DialogTitle>
				</DialogHeader>
				<div
					className="h-full space-y-4 overflow-y-auto border-t pt-4"
					style={{
						scrollbarColor: 'transparent transparent',
						scrollbarWidth: 'thin'
					}}
				>
					<div className="w-full">
						{config &&
						config.length > 0 &&
						interfaces &&
						interfaces.length > 0 ? (
							<AddEditRule
								supportedProtocols={config[0].webui_supported_protocol}
								interfaces={interfaces}
								refetchPolicies={refetchPolicies}
							/>
						) : (
							<Button variant="outline" className="w-full">
								Loading....
							</Button>
						)}
					</div>
					{policies.map((policy) => (
						<Card
							key={policy['.name']}
							className="p-4 shadow-sm transition-shadow duration-200 hover:shadow"
						>
							<div className="flex flex-col gap-4">
								<div className="flex flex-wrap gap-14">
									<div className="flex flex-col gap-1">
										<div className="text-muted-foreground text-sm font-medium">
											Name:
										</div>
										<div className="text-sm">{policy.name}</div>
									</div>
									<div className="flex flex-col gap-1">
										<div className="text-muted-foreground text-sm font-medium">
											Status:
										</div>
										<div className="text-sm">
											{policy.enabled === '1' ? 'Enabled' : 'Disabled'}
										</div>
									</div>
									<div className="ml-auto flex flex-col gap-1">
										<div className="flex gap-2">
											<DeletePolicy
												policyName={policy['.name']}
												refetchPolicies={refetchPolicies}
											/>
											{config &&
												config.length > 0 &&
												interfaces &&
												interfaces.length > 0 && (
													<div className="w-full">
														<AddEditRule
															supportedProtocols={
																config[0].webui_supported_protocol
															}
															interfaces={interfaces}
															refetchPolicies={refetchPolicies}
															policy={policy['.name']}
															initialValues={policy}
														/>
													</div>
												)}
										</div>
									</div>
								</div>
								{(policy.src_addr || policy.dest_addr) && (
									<div className="space-y-4 border-t pt-4">
										{policy.src_addr && (
											<Field label="Source Address" value={policy.src_addr} />
										)}
										{policy.src_port && (
											<Field label="Source Port" value={policy.src_port} />
										)}
										{policy.dest_addr && (
											<Field
												label="Destination Address"
												value={policy.dest_addr}
											/>
										)}
										{policy.dest_port && (
											<Field
												label="Destination Port"
												value={policy.dest_port}
											/>
										)}
										{policy.interface && (
											<Field label="Interface" value={policy.interface} />
										)}
										{policy.proto && (
											<Field label="Protocol" value={policy.proto} />
										)}
									</div>
								)}
							</div>
						</Card>
					))}
					{isLoading && (
						<div className="grid h-full w-full place-items-center">
							<LoaderCircle className="h-12 w-12 animate-spin" />
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

function DeletePolicy({
	policyName,
	refetchPolicies
}: {
	policyName: string;
	refetchPolicies: () => Promise<any>;
}) {
	const [isLoading, setIsLoading] = useState(false);
	async function deleteAction() {
		setIsLoading(true);
		try {
			const deleteResponse = await deletePBRPolicyAction({
				name: policyName
			});
			if (!deleteResponse.success) {
				toast.error(deleteResponse.errorMessage, {
					richColors: true
				});
				return;
			}
			await refetchPolicies();
			toast.success('Policy deleted successfully', {
				richColors: true
			});
		} catch (err) {
			toast.error('Something went wrong', {
				richColors: true
			});
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<Button
			variant={'outline'}
			onClick={() => {
				deleteAction();
			}}
			disabled={isLoading}
		>
			<Trash2Icon />
		</Button>
	);
}
