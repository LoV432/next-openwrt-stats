import { db } from '@/lib/db';
import UserCard from './UserCard.client';
import { userReturnType } from '@/app/api/dhcp-event/route';
export default function UserCards() {
	let allUsers = db.prepare('SELECT * FROM users').all() as userReturnType[];
	allUsers.sort((a, b) => {
		return a.indexNumber - b.indexNumber;
	});
	return allUsers.map((user) => (
		<UserCard
			name={user.name}
			displayName={user.displayName}
			ip={user.ip}
			macaddress={user.macaddress}
			lastupdated={user.lastupdated}
			devicetype={user.devicetype}
		/>
	));
}
