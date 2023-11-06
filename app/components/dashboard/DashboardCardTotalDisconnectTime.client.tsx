'use client';

import { useEffect, useRef, useState } from 'react';
import { connectionLogsList } from './Dashboard.server';
import DashboardCardBase from './DashboardBase.server';
import ConnectionLogsListModal from './ConnectionLogsListModal.client';
import Image from 'next/image';
import { connectionLogsListToHumanFormat } from '@/lib/logs-list-to-human-format';

export default function DashboardCardTotalDisconnectTime({
	allConnectionLogs
}: {
	allConnectionLogs: connectionLogsList;
}) {
	const [humanReadableDisconnectedTime, setHumanReadableDisconnectedTime] =
		useState('Loading...');
	const [backgroundColor, setBackgroundColor] = useState(
		dashboardColor(allConnectionLogs)
	);
	let connectionLogsListModalRef = useRef<HTMLDialogElement>(null);
	function toggleConnectionLogsListModal() {
		if (connectionLogsListModalRef.current?.open) {
			connectionLogsListModalRef.current.close();
		} else {
			connectionLogsListModalRef.current?.showModal();
		}
	}
	useEffect(() => {
		setHumanReadableDisconnectedTime(
			connectionLogsListToHumanFormat(allConnectionLogs)
		);
		setBackgroundColor(dashboardColor(allConnectionLogs));
	}, []);
	return (
		<>
			<DashboardCardBase backgroundColor={backgroundColor}>
				<div className="text-xl font-bold">
					{humanReadableDisconnectedTime} in 24 hours
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

function dashboardColor(allConnectionLogs: connectionLogsList) {
	let backgroundColor = 'bg-emerald-700';
	allConnectionLogs.forEach((status) => {
		if (status.status === 'disconnected') {
			backgroundColor = 'bg-red-800';
		}
	});
	return backgroundColor;
}
