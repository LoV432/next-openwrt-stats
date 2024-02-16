'use client';
import { useAtomValue } from 'jotai';
import { allSpeedStates } from '../../boundaries/SpeedBoundarie.client';
import { useRef } from 'react';

export default function PerUserSpeedDetails({
	allUsers
}: {
	allUsers: {
		index_number: number;
		ip: string;
		name: string;
		display_name: string;
	}[];
}) {
	const perUserSpeedModal = useRef(
		null
	) as unknown as React.MutableRefObject<HTMLDialogElement>;
	return (
		<>
			<div className="text-right text-sm font-semibold text-gray-400 opacity-80 hover:cursor-pointer">
				<div
					onClick={() => perUserSpeedModal.current?.showModal()}
					className="mt-2 w-5/6"
				>
					Show Details
				</div>
			</div>
			<PerUserSpeedDetailsPopUp
				allUsers={allUsers}
				perUserSpeedModal={perUserSpeedModal}
			/>
		</>
	);
}

function PerUserSpeedDetailsPopUp({
	allUsers,
	perUserSpeedModal
}: {
	allUsers: {
		index_number: number;
		ip: string;
		name: string;
		display_name: string;
	}[];
	perUserSpeedModal: React.MutableRefObject<HTMLDialogElement>;
}) {
	function closePopUp() {
		perUserSpeedModal.current?.close();
	}
	const allSpeeds = useAtomValue(allSpeedStates);
	if (!allSpeeds[0].length)
		return (
			<>
				<dialog ref={perUserSpeedModal} className="modal">
					<div className="modal-box !min-h-[400px] w-11/12 min-w-[auto] bg-zinc-900 sm:w-3/4 md:w-1/2 lg:w-1/2">
						<h3 className="pb-5 text-lg font-bold">Per User Speed</h3>

						<div className="overflow-x-auto">
							<table className="table table-fixed">
								<thead>
									<tr className="border-zinc-700">
										<th>Name</th>
										<th>Download</th>
										<th>Upload</th>
									</tr>
								</thead>
								<tbody></tbody>
							</table>
						</div>

						<button
							onClick={closePopUp}
							className="btn btn-circle btn-ghost btn-sm absolute right-2 top-2"
						>
							✕
						</button>
					</div>
					<div className="modal-backdrop bg-zinc-700 opacity-30">
						<button onClick={closePopUp}>close</button>
					</div>
				</dialog>
			</>
		);
	const ipToName = allSpeeds[0].map((user) => {
		const name = allUsers.filter((u) => u.ip === user.ip)[0];
		if (!name) return;
		if (Number(user.in) <= 0 && Number(user.out) <= 0) return;
		return {
			index_number: name.index_number,
			name: name.name == 'Unknown' ? name.display_name : name.name,
			in: user.in,
			out: user.out
		};
	});
	const ipToNameFiltered = ipToName.filter((u) => u !== undefined) as {
		index_number: number;
		name: string;
		in: string;
		out: string;
	}[];
	ipToNameFiltered.sort((a, b) => a.index_number - b.index_number);
	return (
		<>
			<dialog ref={perUserSpeedModal} className="modal">
				<div className="modal-box !min-h-[400px] w-11/12 min-w-[auto] bg-zinc-900 sm:w-3/4 md:w-1/2 lg:w-1/2">
					<h3 className="pb-5 text-lg font-bold">Per User Speed</h3>

					<div className="overflow-x-auto">
						<table className="table table-fixed">
							<thead>
								<tr className="border-zinc-700">
									<th>Name</th>
									<th>Download</th>
									<th>Upload</th>
								</tr>
							</thead>
							<tbody>
								{ipToNameFiltered.map((user) => (
									<tr className="border-zinc-700" key={user.name}>
										<td>{user.name}</td>
										<td>{user.in} Mbps</td>
										<td>{user.out} Mbps</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<button
						onClick={closePopUp}
						className="btn btn-circle btn-ghost btn-sm absolute right-2 top-2"
					>
						✕
					</button>
				</div>
				<div className="modal-backdrop bg-zinc-700 opacity-30">
					<button onClick={closePopUp}>close</button>
				</div>
			</dialog>
		</>
	);
}
