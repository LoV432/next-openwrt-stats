import { db } from '@/lib/db';
import UserCard from './UserCard.client';
export default function UserCards() {
	type userReturnType = {
		id: number;
		name: string;
		ip: string;
		macaddress: string;
		lastupdated: number;
		devicetype: string;
		lastEventType: string;
	}[];
	let allUsers = db.prepare('SELECT * FROM users').all() as userReturnType;
	return allUsers.map((user) => (
		<UserCard
			name={user.name}
			ip={user.ip}
			macaddress={user.macaddress}
			lastupdated={user.lastupdated}
			devicetype={user.devicetype}
		/>
	));
}
