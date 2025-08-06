import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { QueryProvider } from '@/providers/queryProvider';

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
			<body>
				<Toaster />
				<QueryProvider>{children}</QueryProvider>
			</body>
		</html>
	);
}
