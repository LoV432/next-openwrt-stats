import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { QueryProvider } from '@/providers/queryProvider';
import { NetworkProvider } from '@/providers/networkContext';

export const metadata = {
	title: 'Openwrt Stats',
	description: 'Openwrt Stats'
};

export default function RootLayout({
	children
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className="dark">
			<body className="font-sans">
				<Toaster />
				<QueryProvider>
					<NetworkProvider>{children}</NetworkProvider>
				</QueryProvider>
			</body>
		</html>
	);
}
