'use client';

import { useEffect, useRef, useState } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import { allSpeedStates } from '../boundaries/SpeedBoundarie.client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { userReturnType } from '@/app/api/dhcp-event/route';
import CopyToast from '../misc/CopyToast';
import {
	blockDevice as blockUser,
	getAllBlockedDevices,
	unblockDevice as unblockUser
} from '@/lib/block-user-script.server';
import { allBlockedDevices as allBlockedDevicesState } from '../boundaries/BlockedDevices/BlockedDevicesBoundarie.client';
import { allConnectedDevices as allConnectedDevicesState } from '../boundaries/ConnectedDevices/ConnectedDevicesBoundarie.client';
export default function UserCard({ user }: { user: userReturnType }) {
	const [localUpdateTime, setLocalUpdateTime] = useState('');
	const [showDetails, setShowDetails] = useState(false);
	const [showToast, setShowToast] = useState(false);
	const allBlockedDevices = useAtomValue(allBlockedDevicesState);
	const isBlocked = allBlockedDevices.includes(user.mac_address);
	const allConnectedDevices = useAtomValue(allConnectedDevicesState);
	const isConnected = allConnectedDevices.includes(user.mac_address);

	function copyText(text: string) {
		// TODO: This whole copy/toast logic is duplicate of DashboardCardCurrentStatus.client.tsx. Find a way to merge?
		navigator.clipboard.writeText(text);
		setShowToast(true);
		setTimeout(() => {
			setShowToast(false);
		}, 3000);
	}

	useEffect(() => {
		setLocalUpdateTime(
			new Date(user.last_updated).toLocaleString('en-US', {
				day: '2-digit',
				month: 'short',
				hour: 'numeric',
				minute: '2-digit'
			})
		);
	}, []);
	return (
		<>
			{/*TODO: Need to find a better way to handle overflow of dropdown in last row*/}
			<div
				className={`card card-side m-5 h-fit w-full bg-zinc-900 p-2 shadow-xl last:mb-[7rem] sm:w-[300px] ${isBlocked ? 'text-error' : ''}`}
			>
				<div className="absolute right-0 top-0">
					{isConnected && (
						<span className="badge indicator-item badge-success badge-sm absolute -right-1 -top-1"></span>
					)}
				</div>
				<UserSpeed ip={user.ip} />
				<figure className="relative flex w-1/4 items-center justify-center overflow-visible px-1 py-4">
					<DropDown
						mac_address={user.mac_address}
						device_type={user.device_type}
						index_number={user.index_number}
					/>
				</figure>
				<div className="card-body w-2/3 p-4">
					<h2
						className={`card-title border-b border-white border-opacity-30 pb-2`}
					>
						<p className={!showDetails ? 'line-clamp-1' : ''}>
							{user.display_name || user.name}
						</p>
					</h2>
					<h2
						onClick={() => {
							copyText(user.ip);
						}}
						className="card-title cursor-pointer border-b border-white border-opacity-30 pb-2"
					>
						{user.ip}
					</h2>
					{showDetails ? (
						<>
							<h2
								onClick={() => {
									copyText(user.mac_address);
								}}
								className="card-title cursor-pointer border-b border-white border-opacity-30 pb-2"
							>
								{user.mac_address.toUpperCase()}
							</h2>
							<h2 className="card-title border-b border-white border-opacity-30 pb-2">
								{localUpdateTime || user.last_updated}
							</h2>
							<h2 className="card-title border-b border-white border-opacity-30 pb-2">
								{user.last_event_type.toUpperCase()}
							</h2>
						</>
					) : (
						<></>
					)}
					<div
						className="text-right text-sm font-semibold text-gray-400 opacity-80 hover:cursor-pointer"
						onClick={() => setShowDetails(!showDetails)}
					>
						{showDetails ? 'Hide Details' : 'Show Details'}
					</div>
				</div>
			</div>
			{showToast ? <CopyToast /> : null}
		</>
	);
}

function UserSpeed({ ip }: { ip: string }) {
	const allSpeeds = useAtomValue(allSpeedStates);
	const [speed, setSpeed] = useState({ upload: '', download: '' });
	useEffect(() => {
		if (!allSpeeds[0].length) return;
		allSpeeds[0].map((user) => {
			if (user.ip === ip) {
				setSpeed({
					upload: user.out,
					download: user.in
				});
			}
		});
	}, [allSpeeds]);
	return parseFloat(speed.upload) > 0 || parseFloat(speed.download) > 0 ? (
		<p className="semi-bold absolute -top-6 text-sm text-zinc-300">
			▲ {speed.upload} / {speed.download} ▼
		</p>
	) : (
		<></>
	);
}

function DropDown({
	mac_address,
	device_type,
	index_number
}: {
	mac_address: string;
	device_type: string;
	index_number: number;
}) {
	const [dropDownIsOpen, SetDropDownIsOpen] = useState(false);
	const [macAddress] = useState(mac_address);
	const [changeNameModalIsOpen, setChangeNamemodalIsOpen] = useState(false);
	const [iconModalIsOpen, setIconModalIsOpen] = useState(false);
	const [deleteDeviceModalIsOpen, setDeleteDeviceModalIsOpen] = useState(false);
	const [blockDeviceModalIsOpen, setBlockDeviceModalIsOpen] = useState(false);
	const [unblockDeviceModalIsOpen, setUnblockDeviceModalIsOpen] =
		useState(false);
	const [changeIndexModalIsOpen, setChangeIndexModalIsOpen] = useState(false);
	const allBlockedDevices = useAtomValue(allBlockedDevicesState);
	const isBlocked = allBlockedDevices.includes(mac_address);

	return (
		<>
			<button
				onClick={() => SetDropDownIsOpen(true)}
				className="btn m-0 h-fit w-full border-none bg-transparent p-0 hover:bg-transparent active:bg-transparent"
			>
				<Image
					src={`/${device_type}.svg`}
					alt="Android Icon"
					width={25}
					height={25}
					className={`w-full cursor-pointer transition-transform hover:scale-125`}
				/>
			</button>
			{dropDownIsOpen && (
				<>
					<div className="absolute left-0 top-0 z-30 h-20">
						<ul className="menu rounded-box w-48 border border-white border-opacity-20 bg-zinc-900 text-lg font-semibold">
							{!isBlocked ? (
								<li>
									<p
										onClick={() => {
											setBlockDeviceModalIsOpen(true);
											SetDropDownIsOpen(false);
										}}
										className="flex h-12 justify-center hover:!bg-error hover:!text-black focus:!bg-error focus:!text-black active:!bg-error active:!text-black"
									>
										Block Internet
									</p>
								</li>
							) : (
								<li>
									<p
										onClick={() => {
											setUnblockDeviceModalIsOpen(true);
											SetDropDownIsOpen(false);
										}}
										className="flex h-12 justify-center hover:!bg-error hover:!text-black focus:!bg-error focus:!text-black active:!bg-error active:!text-black"
									>
										Unblock Internet
									</p>
								</li>
							)}
							<li>
								<p
									className="flex h-12 justify-center"
									onClick={() => {
										setChangeNamemodalIsOpen(true);
										SetDropDownIsOpen(false);
									}}
								>
									Change Name
								</p>
							</li>
							<li>
								<p
									className="flex h-12 justify-center"
									onClick={() => {
										setIconModalIsOpen(true);
										SetDropDownIsOpen(false);
									}}
								>
									Change Icon
								</p>
							</li>
							<li>
								<p
									onClick={() => {
										setChangeIndexModalIsOpen(true);
										SetDropDownIsOpen(false);
									}}
									className="flex h-12 justify-center"
								>
									Change Position
								</p>
							</li>
							<li>
								<p
									onClick={() => {
										setDeleteDeviceModalIsOpen(true);
										SetDropDownIsOpen(false);
									}}
									className="flex h-12 justify-center hover:!bg-error hover:!text-black focus:!bg-error focus:!text-black active:!bg-error active:!text-black "
								>
									Delete
								</p>
							</li>
						</ul>
					</div>
					<div
						onClick={() => {
							SetDropDownIsOpen(false);
						}}
						className="fixed left-0 top-0 z-20"
					></div>
				</>
			)}
			{changeNameModalIsOpen && (
				<NameChangePopUp
					macAddress={macAddress}
					setChangeNamemodalIsOpen={setChangeNamemodalIsOpen}
				/>
			)}
			{iconModalIsOpen && (
				<IconChangePopUp
					macAddress={macAddress}
					setIconModalIsOpen={setIconModalIsOpen}
				/>
			)}
			{deleteDeviceModalIsOpen && (
				<DeleteDevicePopUp
					macAddress={macAddress}
					setDeleteDeviceModalIsOpen={setDeleteDeviceModalIsOpen}
				/>
			)}
			{changeIndexModalIsOpen && (
				<ChangeIndexPopUp
					macAddress={macAddress}
					setChangeIndexModalIsOpen={setChangeIndexModalIsOpen}
					index_number={index_number}
				/>
			)}
			{blockDeviceModalIsOpen && (
				<BlockDevicePopUp
					macAddress={macAddress}
					setBlockDeviceModalIsOpen={setBlockDeviceModalIsOpen}
				/>
			)}
			{unblockDeviceModalIsOpen && (
				<UnblockDevicePopUp
					macAddress={macAddress}
					setUnblockDeviceModalIsOpen={setUnblockDeviceModalIsOpen}
				/>
			)}
		</>
	);
}

// All the timeouts below this are for animations

function NameChangePopUp({
	macAddress,
	setChangeNamemodalIsOpen
}: {
	macAddress: string;
	setChangeNamemodalIsOpen: (value: boolean) => void;
}) {
	let router = useRouter();
	const changeNameValue = useRef<HTMLInputElement>(null);
	let changeNameModal = useRef<HTMLDialogElement>(null);
	async function changeName() {
		let newName = changeNameValue.current?.value;
		await fetch(`/api/edit/display-name`, {
			body: JSON.stringify({
				macAddress: macAddress,
				displayName: newName
			}),
			method: 'POST'
		});
		closePopUp();
		router.refresh();
	}
	async function closePopUp() {
		changeNameModal.current?.close();
		await new Promise((resolve) => setTimeout(resolve, 100));
		setChangeNamemodalIsOpen(false);
	}
	useEffect(() => {
		(async () => {
			await new Promise((resolve) => setTimeout(resolve, 10));
			changeNameModal.current?.setAttribute('open', 'true'); // This is to prevent auto focus
			if (!('ontouchstart' in window)) {
				changeNameValue.current?.focus();
			}
		})();
	}, []);
	return (
		<dialog ref={changeNameModal} className="modal">
			<div className="modal-box bg-zinc-900">
				<h3 className="pb-5 text-lg font-bold">Enter New Name</h3>
				<input
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							changeName();
						}
					}}
					ref={changeNameValue}
					type="text"
					placeholder="Name"
					className="input input-bordered w-full bg-zinc-900"
				/>
				<button onClick={changeName} className="btn btn-primary mt-5 w-full">
					Apply
				</button>
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
	);
}

function ChangeIndexPopUp({
	macAddress,
	index_number,
	setChangeIndexModalIsOpen
}: {
	macAddress: string;
	index_number: number;
	setChangeIndexModalIsOpen: (value: boolean) => void;
}) {
	let router = useRouter();
	const changeIndexValue = useRef<HTMLInputElement>(null);
	let setChangeIndexModal = useRef<HTMLDialogElement>(null);
	async function changeIndex() {
		let newIndex = changeIndexValue.current?.value;
		await fetch(`/api/edit/change-index`, {
			body: JSON.stringify({
				macAddress: macAddress,
				index: newIndex
			}),
			method: 'POST'
		});
		closePopUp();
		router.refresh();
	}
	async function closePopUp() {
		setChangeIndexModal.current?.close();
		await new Promise((resolve) => setTimeout(resolve, 100));
		setChangeIndexModalIsOpen(false);
	}
	useEffect(() => {
		(async () => {
			await new Promise((resolve) => setTimeout(resolve, 10));
			setChangeIndexModal.current?.setAttribute('open', 'true'); // This is to prevent auto focus
			if (!('ontouchstart' in window)) {
				changeIndexValue.current?.focus();
			}
		})();
	}, []);
	return (
		<dialog ref={setChangeIndexModal} className="modal">
			<div className="modal-box bg-zinc-900">
				<h3 className="pb-5 text-lg font-bold">Enter New Position</h3>
				<input
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							changeIndex();
						}
					}}
					ref={changeIndexValue}
					type="text"
					placeholder={`Current Position: ${index_number}`}
					className="input input-bordered w-full bg-zinc-900"
				/>
				<button onClick={changeIndex} className="btn btn-primary mt-5 w-full">
					Apply
				</button>
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
	);
}

function DeleteDevicePopUp({
	macAddress,
	setDeleteDeviceModalIsOpen
}: {
	macAddress: string;
	setDeleteDeviceModalIsOpen: (value: boolean) => void;
}) {
	let router = useRouter();
	let deleteDeviceModal = useRef<HTMLDialogElement>(null);
	async function deleteDevice() {
		await fetch(`/api/edit/delete-user`, {
			body: JSON.stringify({
				macAddress: macAddress
			}),
			method: 'POST'
		});
		closePopUp();
		router.refresh();
	}
	async function closePopUp() {
		deleteDeviceModal.current?.close();
		await new Promise((resolve) => setTimeout(resolve, 100));
		setDeleteDeviceModalIsOpen(false);
	}

	useEffect(() => {
		(async () => {
			await new Promise((resolve) => setTimeout(resolve, 10));
			deleteDeviceModal.current?.showModal();
		})();
	}, []);
	return (
		<dialog ref={deleteDeviceModal} className="modal">
			<div className="modal-box bg-zinc-900">
				<h3 className="pb-5 text-lg font-bold">Delete Device</h3>
				<p>Are you sure you want to delete this device?</p>
				<button onClick={deleteDevice} className="btn btn-error mt-5 w-full">
					Delete
				</button>
				<button onClick={closePopUp} className="btn btn-ghost mt-5 w-full">
					Cancel
				</button>
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
	);
}

function BlockDevicePopUp({
	macAddress,
	setBlockDeviceModalIsOpen
}: {
	macAddress: string;
	setBlockDeviceModalIsOpen: (value: boolean) => void;
}) {
	const router = useRouter();
	const blockDeviceModal = useRef<HTMLDialogElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const isRunning = useRef(false);
	const setBlockedDevices = useSetAtom(allBlockedDevicesState);
	async function blockDevice() {
		isRunning.current = true;
		if (!buttonRef.current) return;
		buttonRef.current.setAttribute('disabled', 'true');
		buttonRef.current.classList.add('after:loading');
		buttonRef.current.innerText = '';
		await blockUser(macAddress);
		const allBlockedDevices = await getAllBlockedDevices();
		if (!('error' in allBlockedDevices)) setBlockedDevices(allBlockedDevices);
		buttonRef.current.classList.remove('after:loading');
		buttonRef.current.removeAttribute('disabled');
		isRunning.current = false;
		closePopUp();
		router.refresh();
	}
	async function closePopUp() {
		if (isRunning.current) return;
		blockDeviceModal.current?.close();
		await new Promise((resolve) => setTimeout(resolve, 100));
		setBlockDeviceModalIsOpen(false);
	}

	useEffect(() => {
		(async () => {
			await new Promise((resolve) => setTimeout(resolve, 10));
			blockDeviceModal.current?.showModal();
		})();
	}, []);
	return (
		<dialog ref={blockDeviceModal} className="modal">
			<div className="modal-box bg-zinc-900">
				<h3 className="pb-5 text-lg font-bold">Block Device</h3>
				<p>Are you sure you want to block this device internet access?</p>
				<button
					ref={buttonRef}
					onClick={blockDevice}
					className="btn btn-error mt-5 w-full"
				>
					Block
				</button>
				<button onClick={closePopUp} className="btn btn-ghost mt-5 w-full">
					Cancel
				</button>
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
	);
}

function UnblockDevicePopUp({
	macAddress,
	setUnblockDeviceModalIsOpen
}: {
	macAddress: string;
	setUnblockDeviceModalIsOpen: (value: boolean) => void;
}) {
	const router = useRouter();
	const unblockDeviceModal = useRef<HTMLDialogElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const isRunning = useRef(false);
	const setBlockedDevices = useSetAtom(allBlockedDevicesState);
	async function unblockDevice() {
		isRunning.current = true;
		if (!buttonRef.current) return;
		buttonRef.current.setAttribute('disabled', 'true');
		buttonRef.current.classList.add('after:loading');
		buttonRef.current.innerText = '';
		await unblockUser(macAddress);
		const allBlockedDevices = await getAllBlockedDevices();
		if (!('error' in allBlockedDevices)) setBlockedDevices(allBlockedDevices);
		buttonRef.current.classList.remove('after:loading');
		buttonRef.current.removeAttribute('disabled');
		isRunning.current = false;
		closePopUp();
		router.refresh();
	}
	async function closePopUp() {
		if (isRunning.current) return;
		unblockDeviceModal.current?.close();
		await new Promise((resolve) => setTimeout(resolve, 100));
		setUnblockDeviceModalIsOpen(false);
	}

	useEffect(() => {
		(async () => {
			await new Promise((resolve) => setTimeout(resolve, 10));
			unblockDeviceModal.current?.showModal();
		})();
	}, []);
	return (
		<dialog ref={unblockDeviceModal} className="modal">
			<div className="modal-box bg-zinc-900">
				<h3 className="pb-5 text-lg font-bold">Unblock Device</h3>
				<p>Are you sure you want to Unblock this device internet access?</p>
				<button
					ref={buttonRef}
					onClick={unblockDevice}
					className="btn btn-error mt-5 w-full"
				>
					Unblock
				</button>
				<button onClick={closePopUp} className="btn btn-ghost mt-5 w-full">
					Cancel
				</button>
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
	);
}

function IconChangePopUp({
	macAddress,
	setIconModalIsOpen
}: {
	macAddress: string;
	setIconModalIsOpen: (value: boolean) => void;
}) {
	let router = useRouter();
	let changeIconModal = useRef<HTMLDialogElement>(null);
	async function changeIcon(icon: string) {
		await fetch(`/api/edit/device-type`, {
			body: JSON.stringify({
				macAddress: macAddress,
				deviceType: icon
			}),
			method: 'POST'
		});
		closePopUp();
		router.refresh();
	}
	async function closePopUp() {
		changeIconModal.current?.close();
		await new Promise((resolve) => setTimeout(resolve, 100));
		setIconModalIsOpen(false);
	}
	useEffect(() => {
		(async () => {
			await new Promise((resolve) => setTimeout(resolve, 10));
			changeIconModal.current?.showModal();
		})();
	}, []);
	return (
		<dialog ref={changeIconModal} className="modal">
			<div className="modal-box bg-zinc-900">
				<h3 className="pb-5 text-lg font-bold">Select Icon</h3>
				<div className="flex flex-row flex-wrap justify-evenly gap-5">
					<Image
						onClick={() => changeIcon('android')}
						id="android"
						src="/android.svg"
						alt="Android Icon"
						width={80}
						height={80}
						className="cursor-pointer transition-transform hover:scale-125"
					/>
					<Image
						onClick={() => changeIcon('apple')}
						id="apple"
						src="/apple.svg"
						alt="Apple Icon"
						width={80}
						height={80}
						className="cursor-pointer transition-transform hover:scale-125"
					/>
					<Image
						onClick={() => changeIcon('windows')}
						id="windows"
						src="/windows.svg"
						alt="Windows Icon"
						width={80}
						height={80}
						className="cursor-pointer transition-transform hover:scale-125"
					/>
					<Image
						onClick={() => changeIcon('linux')}
						id="linux"
						src="/linux.svg"
						alt="Linux Icon"
						width={80}
						height={80}
						className="cursor-pointer transition-transform hover:scale-125"
					/>
					<Image
						onClick={() => changeIcon('xbox')}
						id="xbox"
						src="/xbox.svg"
						alt="Xbox Icon"
						width={80}
						height={80}
						className="cursor-pointer transition-transform hover:scale-125"
					/>
					<Image
						onClick={() => changeIcon('playstation')}
						id="playstation"
						src="/playstation.svg"
						alt="Playstation Icon"
						width={80}
						height={80}
						className="cursor-pointer transition-transform hover:scale-125"
					/>
					<Image
						onClick={() => changeIcon('tv')}
						id="tv"
						src="tv.svg"
						alt="TV Icon"
						width={80}
						height={80}
						className="cursor-pointer transition-transform hover:scale-125"
					/>
					<Image
						onClick={() => changeIcon('generic')}
						id="generic"
						src="generic.svg"
						alt="Generic Icon"
						width={80}
						height={80}
						className="cursor-pointer transition-transform hover:scale-125"
					/>
					<Image
						onClick={() => changeIcon('server')}
						id="server"
						src="server.svg"
						alt="Server Icon"
						width={80}
						height={80}
						className="cursor-pointer transition-transform hover:scale-125"
					/>
					<Image
						onClick={() => changeIcon('router')}
						id="router"
						src="router.svg"
						alt="Router Icon"
						width={80}
						height={80}
						className="cursor-pointer transition-transform hover:scale-125"
					/>
					<Image
						onClick={() => changeIcon('repeater')}
						id="repeater"
						src="repeater.svg"
						alt="Repeater Icon"
						width={80}
						height={80}
						className="cursor-pointer transition-transform hover:scale-125"
					/>
					<Image
						onClick={() => changeIcon('iot')}
						id="iot"
						src="iot.svg"
						alt="iot Icon"
						width={80}
						height={80}
						className="cursor-pointer transition-transform hover:scale-125"
					/>
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
	);
}
