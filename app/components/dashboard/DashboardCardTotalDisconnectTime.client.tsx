'use client';

import { useEffect, useRef, useState } from 'react';
import { connectionLogsList } from './Dashboard.server';
import DashboardCardBase from './DashboardBase.server';
import ConnectionLogsListModal from './ConnectionLogsListModal.client';
import Image from 'next/image';
import { connectionLogsListToHumanFormat } from '@/lib/logs-list-to-human-format';

export default function DashboardCardTotalDisconnectTime({
	humanReadableDisconnectedTimePrerender
}: {
	humanReadableDisconnectedTimePrerender: string;
}) {
	const [humanReadableDisconnectedTime, setHumanReadableDisconnectedTime] =
		useState(humanReadableDisconnectedTimePrerender);
	const [backgroundColor, setBackgroundColor] = useState(
		dashboardColor(humanReadableDisconnectedTimePrerender)
	);
	let connectionLogsListModalRef = useRef<HTMLDialogElement>(null);
	function toggleConnectionLogsListModal() {
		if (connectionLogsListModalRef.current?.open) {
			connectionLogsListModalRef.current.close();
		} else {
			connectionLogsListModalRef.current?.showModal();
		}
	}
	return (
		<>
			<DashboardCardBase backgroundColor={backgroundColor}>
				<div className="text-xl font-bold">
					{humanReadableDisconnectedTime}
					<Image
						onClick={toggleConnectionLogsListModal}
						className="ml-3 inline cursor-pointer"
						src="/expand.svg"
						alt="Open Details"
						width={20}
						height={20}
					/>
				</div>
			</DashboardCardBase>
			<ConnectionLogsListModal
				toggleConnectionLogsListModal={toggleConnectionLogsListModal}
				connectionLogsListModalRef={connectionLogsListModalRef}
			/>
		</>
	);
}

function dashboardColor(humanReadableDisconnectedTime: string) {
	let backgroundColor = 'bg-red-800';
	if (humanReadableDisconnectedTime.includes('No Disconnects')) {
		backgroundColor = 'bg-emerald-700';
	}
	return backgroundColor;
}
