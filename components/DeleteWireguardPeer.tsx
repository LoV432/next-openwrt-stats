'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from './ui/alert-dialog';
import { Trash2, LoaderCircle } from 'lucide-react';
import { deleteWireguardPeerAction } from '@/lib/server/wireguardActions';
import { toast } from 'sonner';

export function DeleteWireguardPeer({
	sectionName,
	peerName,
	refetchWireguardInterfaces
}: {
	sectionName: string;
	peerName: string;
	refetchWireguardInterfaces: () => Promise<any>;
}) {
	const [open, setOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	async function handleDelete() {
		setIsLoading(true);
		try {
			const result = await deleteWireguardPeerAction({
				section_name: sectionName
			});

			if (result.success) {
				await refetchWireguardInterfaces();
				toast.success('WireGuard peer deleted successfully', {
					richColors: true
				});
				setOpen(false);
			} else {
				toast.error(result.error || 'Failed to delete WireGuard peer', {
					richColors: true
				});
			}
		} catch (error) {
			toast.error('Failed to delete WireGuard peer', {
				richColors: true
			});
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>
				<Button variant="outline" size="sm">
					<Trash2 className="h-3 w-3" />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete WireGuard Peer</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to delete the WireGuard peer "{peerName}"?
						This action cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
					<Button
						disabled={isLoading}
						onClick={(event) => {
							event.preventDefault();
							handleDelete();
						}}
						variant="destructive"
						className="text-white"
					>
						{isLoading ? 'Deleting...' : 'Delete'}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
