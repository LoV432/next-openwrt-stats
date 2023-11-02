'use client';

import { useEffect, useRef, useState } from 'react';
import { useRecoilState } from 'recoil';
import { allSpeedStates } from '../boundaries/SpeedBoundarie.client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
export default function UserCard({
	name,
	displayName,
	ip,
	macaddress,
	lastupdated,
	devicetype
}: {
	name: string;
	displayName: string;
	ip: string;
	macaddress: string;
	lastupdated: number;
	devicetype: string;
}) {
	const [localUpdateTime, setLocalUpdateTime] = useState('');
	const [showDetails, setShowDetails] = useState(false);
	useEffect(() => {
		setLocalUpdateTime(
			new Date(lastupdated).toLocaleString('en-US', {
				day: '2-digit',
				month: 'short',
				hour: 'numeric',
				minute: '2-digit'
			})
		);
	}, []);
	return (
		<>
			<div className="card card-side m-5 h-fit w-full bg-base-100 p-2 shadow-xl sm:w-[300px]">
				<UserSpeed ip={ip} />
				<figure className="relative flex w-1/4 items-center justify-center overflow-visible px-1 py-4">
					<DropDown macaddress={macaddress} deviceType={devicetype} />
				</figure>
				<div className="card-body w-2/3 p-4">
					<h2 className="card-title border-b border-white border-opacity-30 pb-2">
						{displayName || name}
					</h2>
					<h2 className="card-title border-b border-white border-opacity-30 pb-2">
						{ip}
					</h2>
					{showDetails ? (
						<>
							<h2 className="card-title line-clamp-1 border-b border-white border-opacity-30 pb-2">
								{macaddress.toUpperCase()}
							</h2>
							<h2 className="card-title border-b border-white border-opacity-30 pb-2">
								{localUpdateTime || lastupdated}
							</h2>
						</>
					) : (
						<></>
					)}
					<div
						className="text-right text-sm font-semibold text-zinc-500 hover:cursor-pointer"
						onClick={() => setShowDetails(!showDetails)}
					>
						{showDetails ? 'Hide Details' : 'Show Details'}
					</div>
				</div>
			</div>
		</>
	);
}

function UserSpeed({ ip }: { ip: string }) {
	const [allSpeeds] = useRecoilState(allSpeedStates);
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
	macaddress,
	deviceType
}: {
	macaddress: string;
	deviceType: string;
}) {
	const [dropDownIsOpen, SetDropDownIsOpen] = useState(false);
	const [macAddress] = useState(macaddress);
	const [changeNameModalIsOpen, setChangeNamemodalIsOpen] = useState(false);
	const [iconModalIsOpen, setIconModalIsOpen] = useState(false);

	function toggleNameModal() {
		setChangeNamemodalIsOpen(!changeNameModalIsOpen);
	}

	function toggleIconModal() {
		setIconModalIsOpen(!iconModalIsOpen);
	}

	return (
		<>
			<button
				onClick={() => SetDropDownIsOpen(true)}
				className="btn m-0 h-fit w-full border-none bg-transparent p-0 hover:bg-transparent active:bg-transparent"
			>
				<Image
					src={`/${deviceType}.svg`}
					alt="Android Icon"
					width={25}
					height={25}
					className="w-full cursor-pointer transition-transform hover:scale-125"
				/>
			</button>
			{dropDownIsOpen && (
				<>
					<div className="absolute left-0 top-0 z-30 h-20">
						<ul className="menu rounded-box w-36 bg-base-200">
							<li>
								<p
									onClick={() => {
										toggleNameModal();
										SetDropDownIsOpen(false);
									}}
								>
									Change Name
								</p>
							</li>
							<li>
								<p
									onClick={() => {
										toggleIconModal();
										SetDropDownIsOpen(false);
									}}
								>
									Change Icon
								</p>
							</li>
							<li>
								<a>Delete</a>
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
					toggleNameModal={toggleNameModal}
				/>
			)}
			{iconModalIsOpen && (
				<IconChangePopUp
					macAddress={macAddress}
					toggleIconModal={toggleIconModal}
				/>
			)}
		</>
	);
}

function NameChangePopUp({
	macAddress,
	toggleNameModal
}: {
	macAddress: string;
	toggleNameModal: () => void;
}) {
	let router = useRouter();
	const changeNameValue = useRef<HTMLInputElement>(null);
	function changeName() {
		let newName = changeNameValue.current?.value;
		fetch(`/api/edit/display-name`, {
			body: JSON.stringify({
				macAddress: macAddress,
				displayName: newName
			}),
			method: 'POST'
		});
		toggleNameModal();
		router.refresh();
	}
	return (
		<dialog id="changeNameModal" className="modal" open>
			<div className="modal-box">
				<h3 className="pb-5 text-lg font-bold">Enter New Name</h3>
				<input
					ref={changeNameValue}
					type="text"
					placeholder="Name"
					className="input input-bordered w-full"
				/>
				<button onClick={changeName} className="btn btn-primary mt-5 w-full">
					Apply
				</button>
				<button
					onClick={toggleNameModal}
					className="btn btn-circle btn-ghost btn-sm absolute right-2 top-2"
				>
					✕
				</button>
			</div>
			<div className="modal-backdrop bg-zinc-700 opacity-30">
				<button onClick={toggleNameModal}>close</button>
			</div>
		</dialog>
	);
}

function IconChangePopUp({
	macAddress,
	toggleIconModal
}: {
	macAddress: string;
	toggleIconModal: () => void;
}) {
	let router = useRouter();
	function changeIcon(icon: string) {
		fetch(`/api/edit/device-type`, {
			body: JSON.stringify({
				macAddress: macAddress,
				deviceType: icon
			}),
			method: 'POST'
		});
		toggleIconModal();
		router.refresh();
	}
	return (
		<dialog id="changeNameModal" className="modal" open>
			<div className="modal-box">
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
				</div>
				<button
					onClick={toggleIconModal}
					className="btn btn-circle btn-ghost btn-sm absolute right-2 top-2"
				>
					✕
				</button>
			</div>
			<div className="modal-backdrop bg-zinc-700 opacity-30">
				<button onClick={toggleIconModal}>close</button>
			</div>
		</dialog>
	);
}
