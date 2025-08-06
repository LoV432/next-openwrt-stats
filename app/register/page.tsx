'use client';
import { registerRouter } from '@/lib/server/registerRouter';
import { useState } from 'react';

export default function Register() {
	const [url, setUrl] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [isPrimary, setIsPrimary] = useState(false);

	async function register() {
		const router = await registerRouter(url, username, password, isPrimary);
		if (!router.success) {
			alert(router.error);
			return;
		}
		alert('Router registered');
	}

	return (
		<div className="flex flex-col items-center justify-center">
			<h1 className="text-3xl font-bold">Register</h1>
			<input
				type="text"
				placeholder="URL"
				value={url}
				onChange={(e) => setUrl(e.target.value)}
			/>
			<input
				type="text"
				placeholder="Username"
				value={username}
				onChange={(e) => setUsername(e.target.value)}
			/>
			<input
				type="password"
				placeholder="Password"
				value={password}
				onChange={(e) => setPassword(e.target.value)}
			/>
			<input
				type="checkbox"
				checked={isPrimary}
				onChange={(e) => setIsPrimary(e.target.checked)}
			/>
			<button
				onClick={register}
				className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
			>
				Register
			</button>
		</div>
	);
}
