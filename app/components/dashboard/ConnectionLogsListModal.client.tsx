import { connectionLogsListToHumanFormat } from '@/lib/logs-list-to-human-format';
import { useState, useEffect } from 'react';
import { connectionLogsList } from './Dashboard.server';

export default function ConnectionLogsListModal({
	toggleConnectionLogsListModal,
	connectionLogsListModalRef
}: {
	toggleConnectionLogsListModal: () => void;
	connectionLogsListModalRef: React.RefObject<HTMLDialogElement>;
}) {
	const [days, setDays] = useState(1);
	return (
		<dialog ref={connectionLogsListModalRef} className="modal">
			<div className="modal-box bg-zinc-900">
				<h3 className="pb-5 text-lg font-bold">Connection Logs</h3>
				<p className="pb-5">Number of days to show: {days}</p>
				<input
					type="range"
					min="0"
					max="7"
					className="range range-secondary"
					value={days}
					onChange={(e) => setDays(parseInt(e.target.value))}
				/>
				<ConnectionLogsList days={days} />
				<button
					onClick={toggleConnectionLogsListModal}
					className="btn btn-circle btn-ghost btn-sm absolute right-2 top-2"
				>
					✕
				</button>
			</div>
			<div className="modal-backdrop bg-zinc-700 opacity-30">
				<button onClick={toggleConnectionLogsListModal}>close</button>
			</div>
		</dialog>
	);
}

function ConnectionLogsList({ days }: { days: number }) {
	const [connectionLogsListBody, setConnectionLogsListBody] = useState<
		JSX.Element[]
	>([]);
	const [humanReadableDisconnectedTime, setHumanReadableDisconnectedTime] =
		useState('');
	let listBody: JSX.Element[] = [];

	async function updateLogsList(days: number) {
		const connectionLogsList = (await (
			await fetch(`/api/get-connection-logs?days=${days}`)
		).json()) as connectionLogsList;
		connectionLogsList.forEach((status) => {
			listBody.push(
				<tr className="border-slate-300 border-opacity-30" key={status.id}>
					<th>{status.id}</th>
					<td className="font-semibold">
						{status.status === 'connected' ? 'Connected' : 'Disconnected'}
					</td>
					<td className="font-semibold">
						{new Date(status.time).toLocaleString('en-US', {
							day: '2-digit',
							month: 'short',
							hour: 'numeric',
							minute: '2-digit',
							second: '2-digit'
						})}
					</td>
				</tr>
			);
		});
		setConnectionLogsListBody(listBody);
		setHumanReadableDisconnectedTime(
			connectionLogsListToHumanFormat(connectionLogsList, days)
		);
	}
	useEffect(() => {
		updateLogsList(days);
	}, [days]);
	return (
		<div className="overflow-x-auto">
			{humanReadableDisconnectedTime !== 'No Disconnects' ? (
				<div className="badge badge-error h-fit gap-2">
					{humanReadableDisconnectedTime}
				</div>
			) : null}
			<table className="table">
				<thead className="text-slate-300 ">
					<tr className="border-slate-300 border-opacity-30">
						<th>ID</th>
						<th>Status</th>
						<th>Time</th>
					</tr>
				</thead>
				<tbody>{connectionLogsListBody}</tbody>
			</table>
		</div>
	);
}
