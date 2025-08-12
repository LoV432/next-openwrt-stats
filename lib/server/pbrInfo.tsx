'use server';
import { db } from './dbDriver';
import { routersTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
	addPolicyForm,
	pbrInterfacesSchema,
	pbrPolicySchema
} from '@/types/ubusCalls';
import { ubusCall } from './ubusCalls';

export async function getPBRPolicy() {
	const primaryRouter = await db
		.select({
			routerIP: routersTable.routerIP
		})
		.from(routersTable)
		.where(eq(routersTable.isPrimary, 1))
		.limit(1);

	if (!primaryRouter.length) {
		return {
			success: false,
			error: 'No primary router found'
		} as const;
	}

	const pbrPolicyResponse = await ubusCall({
		routerIP: primaryRouter[0].routerIP,
		params: [
			'uci',
			'get',
			{
				config: 'pbr'
			}
		]
	});

	if (!pbrPolicyResponse.success) {
		return {
			success: false,
			error: pbrPolicyResponse.error
		} as const;
	}

	const parsedPbrPolicyResponse = pbrPolicySchema.safeParse(
		pbrPolicyResponse.data
	);
	if (!parsedPbrPolicyResponse.success) {
		return {
			success: false,
			error: 'Failed to parse pbr policy response'
		} as const;
	}

	return {
		success: true,
		data: parsedPbrPolicyResponse.data.result[1].values
	} as const;
}

export async function getPBRInterfaces() {
	const primaryRouter = await db
		.select({
			routerIP: routersTable.routerIP
		})
		.from(routersTable)
		.where(eq(routersTable.isPrimary, 1))
		.limit(1);

	if (!primaryRouter.length) {
		return {
			success: false,
			error: 'No primary router found'
		} as const;
	}

	const pbrInterfacesResponse = await ubusCall({
		routerIP: primaryRouter[0].routerIP,
		params: ['luci.pbr', 'getInterfaces', {}]
	});

	if (!pbrInterfacesResponse.success) {
		return {
			success: false,
			error: pbrInterfacesResponse.error
		} as const;
	}

	const parsedPbrPolicyResponse = pbrInterfacesSchema.safeParse(
		pbrInterfacesResponse.data
	);
	if (!parsedPbrPolicyResponse.success) {
		return {
			success: false,
			error: 'Failed to parse pbr policy response'
		} as const;
	}

	return {
		success: true,
		data: parsedPbrPolicyResponse.data.result[1].pbr.interfaces
	} as const;
}

export async function setPBRPolicy({
	values
}: {
	values: {
		name: string;
		enabled: string;
		src_addr?: string;
		src_port?: string;
		dest_addr?: string;
		dest_port?: string;
		interface: string;
		proto?: string;
		chain?: string;
	};
}) {
	const parsedForm = addPolicyForm.safeParse(values);
	if (!parsedForm.success) {
		return {
			success: false,
			error: 'Invalid form values'
		} as const;
	}
	const primaryRouter = await db
		.select({
			routerIP: routersTable.routerIP
		})
		.from(routersTable)
		.where(eq(routersTable.isPrimary, 1))
		.limit(1);

	if (!primaryRouter.length) {
		return {
			success: false,
			error: 'No primary router found'
		} as const;
	}

	const postData: Record<string, string> = {};
	Object.entries(parsedForm.data).forEach(([key, value]) => {
		if (value) {
			postData[key] = value;
		}
	});

	const pbrPolicyResponse = await ubusCall({
		routerIP: primaryRouter[0].routerIP,
		params: [
			'uci',
			'add',
			{
				config: 'pbr',
				type: 'policy',
				values: postData
			}
		]
	});
	if (!pbrPolicyResponse.success) {
		return {
			success: false,
			error: pbrPolicyResponse.error
		} as const;
	}

	const commitChangesResponse = await ubusCall({
		routerIP: primaryRouter[0].routerIP,
		params: [
			'uci',
			'commit',
			{
				config: 'pbr'
			}
		]
	});

	if (!commitChangesResponse.success) {
		return {
			success: false,
			error: commitChangesResponse.error
		} as const;
	}

	return {
		success: true,
		data: commitChangesResponse.data
	} as const;
}
