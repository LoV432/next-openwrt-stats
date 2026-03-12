import 'server-only';
import { NextRequest } from 'next/server';
import { getRouter } from '@/lib/server/router';
import { ubusBatchCall } from '@/lib/server/ubusCalls';
import { z } from 'zod';
import { logError } from '@/lib/client/errorLog';

type PackageDiff = {
	source: string;
	target?: string;
	revision: number;
	mandatory?: boolean;
};

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
			errorMessage: string;
	  };

export async function GET(request: NextRequest) {
	try {
		const displayName = request.nextUrl.searchParams.get('displayName');
		if (!displayName) {
			return new Response(
				JSON.stringify({
					success: false,
					errorMessage: 'No router name provided'
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
					errorMessage: 'No router found'
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
			logError({
				displayName: router.data.displayName,
				errorMessage: 'Failed to get board info',
				...response
			});
			return new Response(
				JSON.stringify({
					success: false,
					errorMessage: 'Failed to get board info'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}
		const boardData = response.data.find((data) => data.id === 1);
		if (!boardData?.success) {
			logError({
				displayName: router.data.displayName,
				...boardData
			});
			return new Response(
				JSON.stringify({
					success: false,
					errorMessage: 'Failed to get board info'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const parsedBoardData = updateInfoSchema.safeParse(boardData.result?.[1]);
		const efiData = response.data.filter((data) => data.id === 2)[0];
		if (!parsedBoardData.success || !efiData.success) {
			logError({
				displayName: router.data.displayName,
				...parsedBoardData
			});
			logError({
				displayName: router.data.displayName,
				...efiData
			});
			return new Response(
				JSON.stringify({
					success: false,
					errorMessage: 'Failed to get board info'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const isSnapshot =
			parsedBoardData.data.release.target.includes('snapshot') ||
			parsedBoardData.data.release.version.includes('-rc') ||
			parsedBoardData.data.release.version.includes('snapshot');
		if (isSnapshot) {
			return new Response(
				JSON.stringify({
					success: true,
					data: {
						displayName: router.data.displayName,
						hasUpdate: false,
						currentVersion: parsedBoardData.data.release.version,
						latestVersion: '',
						target: parsedBoardData.data.release.target,
						profile: parsedBoardData.data.board_name,
						rootfs_type: parsedBoardData.data.rootfs_type,
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
			logError({
				displayName: router.data.displayName,
				errorMessage: 'Failed to fetch latest stable release of OpenWrt',
				rawResponse: errorText
			});
			return new Response(
				JSON.stringify({
					success: false,
					errorMessage: 'Failed to fetch latest stable release of OpenWrt'
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
			logError({
				displayName: router.data.displayName,
				errorMessage: 'Unable to fetch latest stable release of OpenWrt'
			});
			return new Response(
				JSON.stringify({
					success: false,
					errorMessage: 'Unable to fetch latest stable release of OpenWrt'
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
		const currentVersion = parsedBoardData.data.release.version;
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
						target: parsedBoardData.data.release.target,
						profile: parsedBoardData.data.board_name,
						rootfs_type: parsedBoardData.data.rootfs_type,
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
			logError({
				displayName: router.data.displayName,
				errorMessage: 'Failed to get installed packages',
				rawResponse: errorText
			});
			return new Response(
				JSON.stringify({
					success: false,
					errorMessage: 'Failed to get installed packages'
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

		try {
			packagesList.forEach((pkg) => {
				if (pkg.includes('Auto-Installed')) {
					return;
				}
				for (const line of pkg.split('\n')) {
					if (
						line.includes('Package: ') &&
						(!pkg.includes('Provides: ') || !pkg.includes('ABIVersion: '))
					) {
						packagesListClean.push(line.replace('Package: ', ''));
						break;
					}
					if (line.includes('Provides: ') && pkg.includes('ABIVersion: ')) {
						packagesListClean.push(line.replace('Provides: ', ''));
						break;
					} else if (line.includes('Provides: ')) {
						throw new Error(
							`Something went wrong while parsing the package list \n ${pkg}`
						);
					}
				}
			});
		} catch (error: any) {
			logError({
				displayName: router.data.displayName,
				errorMessage: 'Failed to parse package list',
				rawResponse: error?.message
			});
			return new Response(
				JSON.stringify({
					success: false,
					errorMessage: error?.message ?? 'Failed to parse package list'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const getPackagesDiffRequest = await fetch(
			'https://sysupgrade.openwrt.org/json/v1/overview.json'
		);
		if (!getPackagesDiffRequest.ok) {
			const errorText = await getPackagesDiffRequest.text();
			logError({
				displayName: router.data.displayName,
				errorMessage: 'Failed to get package diff',
				rawResponse: errorText
			});
			return new Response(
				JSON.stringify({
					success: false,
					errorMessage: 'Failed to get package diff'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}
		const getPackagesDiffJson = await getPackagesDiffRequest.json();
		const packagesDiff = (
			Object.values(getPackagesDiffJson.branches).find((branch: any) => {
				return branch.versions.includes(latestVersion);
			}) as any
		).package_changes as PackageDiff[];
		packagesDiff.forEach((pkg) => {
			if (pkg.target) {
				const index = packagesListClean.findIndex((pkgName) => {
					return pkgName === pkg.source;
				});
				if (index !== -1) {
					packagesListClean[index] = pkg.target;
				}
			}
		});

		const validatedData = {
			hasUpdate,
			currentVersion: currentVersion,
			latestVersion: latestVersion,
			target: parsedBoardData.data.release.target,
			profile: parsedBoardData.data.board_name,
			packages: packagesListClean.sort(),
			displayName: router.data.displayName,
			rootfs_type: parsedBoardData.data.rootfs_type,
			isEfi: efiData.result[1] ? true : false
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
		logError({
			errorMessage: 'Failed to check for updates',
			error
		});
		return new Response(
			JSON.stringify({
				success: false,
				errorMessage: 'Failed to check for updates'
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
