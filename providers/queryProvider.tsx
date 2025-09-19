'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Moving this inside the provider breaks invalidateQueries when called after adding new router
// Which means new router data doesn't show until the page is refreshed
// I'm not sure why this is happening
const queryClient = new QueryClient();
export function QueryProvider({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			<ReactQueryDevtools initialIsOpen={false} />
			{children}
		</QueryClientProvider>
	);
}
