// import { login } from '../server/ubusCalls';

// export async function getSession(forceLogin: boolean = false) {
// 	if (!forceLogin) {
// 		const sessionStorage = window.localStorage.getItem('session');
// 		if (sessionStorage) {
// 			return sessionStorage;
// 		}
// 	}
// 	const newSession = await login();
// 	if (!newSession.success) {
// 		return false;
// 	}
// 	window.localStorage.setItem('session', newSession.data.ubus_rpc_session);
// 	return newSession.data.ubus_rpc_session;
// }
