import 'server-only';
import { NextRequest } from 'next/server';
import { getRouter } from '@/lib/server/router';
import { ubusBatchCall } from '@/lib/server/ubusCalls';
import { z } from 'zod';

const updateInfoSchema = z.object({
	board_name: z.string(),
	release: z.object({
		version: z.string(),
		target: z.string()
	}),
	rootfs_type: z.string()
});

export type RouterUpdateInfo =
	| {
			success: true;
			data: {
				displayName: string;
				hasUpdate: boolean;
				currentVersion: string;
				latestVersion: string;
				target: string;
				profile: string;
				rootfs_type: string;
				packages: string[];
				isEfi: boolean;
				isSnapshot: boolean;
			};
	  }
	| {
			success: false;
			error: string;
	  };

export async function GET(request: NextRequest) {
	try {
		const displayName = request.nextUrl.searchParams.get('displayName');
		if (!displayName) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'No router name provided'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const router = await getRouter(displayName);
		if (!router.success) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'No router found'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const response = await ubusBatchCall({
			displayName: router.data.displayName,
			calls: [
				{ id: 1, params: ['system', 'board', {}] },
				{
					id: 2,
					params: [
						'file',
						'stat',
						{
							path: '/sys/firmware/efi'
						}
					]
				}
			]
		});

		if (!response.success) {
			console.log('[ERROR] Failed to get board info', {
				error: response.error
			});
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Failed to get board info'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const boardData = response.data[0].result[1];
		const efiData = response.data[1].result[1];
		const parsedBoardInfo = updateInfoSchema.safeParse(boardData);
		if (!parsedBoardInfo.success) {
			console.log('[ERROR] Board info parse error:', parsedBoardInfo.error);
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Failed to parse board info'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const isSnapshot = boardData.release.target.includes('snapshot');
		if (isSnapshot) {
			return new Response(
				JSON.stringify({
					success: true,
					data: {
						displayName: router.data.displayName,
						hasUpdate: false,
						currentVersion: parsedBoardInfo.data.release.version,
						latestVersion: '',
						target: parsedBoardInfo.data.release.target,
						profile: parsedBoardInfo.data.board_name,
						rootfs_type: parsedBoardInfo.data.rootfs_type,
						packages: [],
						isEfi: false,
						isSnapshot: true
					}
				}),
				{
					status: 200,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const latestVersionRequest = await fetch(
			'https://downloads.openwrt.org/.versions.json',
			{
				headers: {
					'User-Agent': 'next-openwrt-stats/2.0.0'
				}
			}
		);
		if (!latestVersionRequest.ok) {
			const errorText = await latestVersionRequest.text();
			console.log('[ERROR] Failed to fetch latest stable release of OpenWrt', {
				status: latestVersionRequest.status,
				error: errorText
			});
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Failed to fetch latest stable release of OpenWrt'
				}),
				{
					status: latestVersionRequest.status,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}
		const latestVersionResponse = await latestVersionRequest.json();
		if (!latestVersionResponse.stable_version) {
			console.log('[ERROR] Unable to fetch latest stable release of OpenWrt');
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Unable to fetch latest stable release of OpenWrt'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}
		const latestVersion = latestVersionResponse.stable_version as string;
		const currentVersion = parsedBoardInfo.data.release.version;
		const hasUpdate = currentVersion !== latestVersion;
		if (!hasUpdate) {
			return new Response(
				JSON.stringify({
					success: true,
					data: {
						displayName: router.data.displayName,
						hasUpdate: false,
						currentVersion: currentVersion,
						latestVersion: latestVersion,
						target: parsedBoardInfo.data.release.target,
						profile: parsedBoardInfo.data.board_name,
						rootfs_type: parsedBoardInfo.data.rootfs_type,
						packages: [],
						isEfi: false
					}
				}),
				{
					status: 200,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const packagesListRequest = await fetch(
			`${router.data.routerIP}/cgi-bin/cgi-exec`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: `sessionid=${router.data.session}&command=/usr/libexec/package-manager-call list-installed`
			}
		);

		if (!packagesListRequest.ok) {
			const errorText = await packagesListRequest.text();
			console.log('[ERROR] Failed to get installed packages', {
				status: packagesListRequest.status,
				error: errorText
			});
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Failed to get installed packages'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const packagesListText = await packagesListRequest.text();
		const packagesList = packagesListText.split('\n\n');
		let packagesListClean: string[] = [];

		packagesList.forEach((pkg) => {
			if (pkg.includes('Auto-Installed')) {
				return;
			}
			pkg.split('\n').forEach((line) => {
				if (line.includes('Package: ')) {
					packagesListClean.push(line.replace('Package: ', ''));
				}
			});
		});

		const validatedData = {
			hasUpdate,
			currentVersion: currentVersion,
			latestVersion: latestVersion,
			target: parsedBoardInfo.data.release.target,
			profile: parsedBoardInfo.data.board_name,
			packages: packagesListClean,
			displayName: router.data.displayName,
			rootfs_type: parsedBoardInfo.data.rootfs_type,
			isEfi: efiData ? true : false
		};

		return new Response(
			JSON.stringify({
				success: true,
				data: validatedData
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	} catch (error) {
		console.log('[ERROR] Failed to check for updates', {
			error
		});
		return new Response(
			JSON.stringify({
				success: false,
				error: 'Failed to check for updates'
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}
}
