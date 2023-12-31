import { db } from '@/lib/db';
import UserCard from './UserCard.client';
import { userReturnType } from '@/app/api/dhcp-event/route';
export default function UserCards() {
	let allUsers = db.prepare('SELECT * FROM users').all() as userReturnType[];
	allUsers.sort((a, b) => {
		return a.index_number - b.index_number;
	});
	return allUsers.map((user) => <UserCard key={user.id} user={user} />);
}
