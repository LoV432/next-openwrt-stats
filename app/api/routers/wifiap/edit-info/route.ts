import { logError } from '@/lib/client/errorLog';
import { getRouter } from '@/lib/server/router';
import { ubusBatchCall } from '@/lib/server/ubusCalls';
import {
	wifiAPCountryListSchema,
	wifiAPFrequencyListSchema,
	wifiAPTxPowerListSchema,
	wifiConfig,
	wifiConfigParent
} from '@/types/ubusCalls';
import { NextRequest } from 'next/server';

export type WifiAPEditForm = {
	wifiAPFrequencyList: {
		channel: number;
		active: boolean;
		band: number;
	}[];
	wifiAPTxPowerList: {
		dbm: number;
		active: boolean;
	}[];
	wifiAPCountryList: {
		country: string;
		code: string;
		active: boolean;
	}[];
	wifiAPParentConfig: {
		channel: string;
		band: string;
		htmode: string;
		txpower?: string;
		disabled?: string;
		country?: string;
	};
	wifiAPConfig: {
		ssid: string;
		device: string;
		disabled?: string;
		key?: string;
		hidden?: string;
	};
};
export async function GET(reuqest: NextRequest) {
	try {
		const displayName = reuqest.nextUrl.searchParams.get('displayName');
		const parentConfigSection = reuqest.nextUrl.searchParams.get(
			'parentConfigSection'
		);
		const configSection = reuqest.nextUrl.searchParams.get('configSection');
		if (!displayName || !parentConfigSection || !configSection) {
			return new Response('Invalid request', {
				status: 400
			});
		}
		const router = await getRouter(displayName);
		if (!router.success) {
			return new Response('Router not found', {
				status: 404
			});
		}
		const data = await ubusBatchCall({
			displayName: router.data.displayName,
			calls: [
				{
					id: 1,
					params: [
						'iwinfo',
						'freqlist',
						{
							device: parentConfigSection
						}
					]
				},
				{
					id: 2,
					params: [
						'iwinfo',
						'txpowerlist',
						{
							device: parentConfigSection
						}
					]
				},
				{
					id: 3,
					params: [
						'iwinfo',
						'countrylist',
						{
							device: parentConfigSection
						}
					]
				},
				{
					id: 4,
					params: [
						'uci',
						'get',
						{
							config: 'wireless',
							section: parentConfigSection
						}
					]
				},
				{
					id: 5,
					params: [
						'uci',
						'get',
						{
							config: 'wireless',
							section: configSection
						}
					]
				}
			]
		});

		if (!data.success) {
			throw new Error('Failed to get wifi AP info for editing', {
				cause: {
					displayName: router.data.displayName,
					...data
				}
			});
		}

		const wifiAPFrequencyListResponse = data.data.filter((d) => d.id === 1)[0];
		const wifiAPTxPowerListResponse = data.data.filter((d) => d.id === 2)[0];
		const wifiAPCountryListResponse = data.data.filter((d) => d.id === 3)[0];
		const wifiAPParentConfigResponse = data.data.filter((d) => d.id === 4)[0];
		const wifiAPConfigResponse = data.data.filter((d) => d.id === 5)[0];

		if (
			!wifiAPFrequencyListResponse.success ||
			!wifiAPTxPowerListResponse.success ||
			!wifiAPCountryListResponse.success ||
			!wifiAPParentConfigResponse.success ||
			!wifiAPConfigResponse.success
		) {
			throw new Error('Failed to get wifi AP info for editing', {
				cause: {
					displayName: router.data.displayName,
					...data
				}
			});
		}

		const wifiAPFrequencyList = wifiAPFrequencyListSchema.parse(
			wifiAPFrequencyListResponse
		);
		const wifiAPTxPowerList = wifiAPTxPowerListSchema.parse(
			wifiAPTxPowerListResponse
		);
		const wifiAPCountryList = wifiAPCountryListSchema.parse(
			wifiAPCountryListResponse
		);

		const wifiAPParentConfig = wifiConfigParent.parse(
			wifiAPParentConfigResponse.result?.[1].values
		);
		const wifiAPConfig = wifiConfig.parse(
			wifiAPConfigResponse.result?.[1].values
		);

		return new Response(
			JSON.stringify({
				wifiAPFrequencyList: wifiAPFrequencyList.result[1].results,
				wifiAPTxPowerList: wifiAPTxPowerList.result[1].results,
				wifiAPCountryList: wifiAPCountryList.result[1].results,
				wifiAPParentConfig: wifiAPParentConfig,
				wifiAPConfig: wifiAPConfig
			}),
			{
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	} catch (error) {
		logError({
			errorMessage: 'Something went wrong while getting the wifi AP info',
			error
		});
		return new Response('Something went wrong', {
			status: 500
		});
	}
}
