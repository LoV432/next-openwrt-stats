import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink } from 'lucide-react';

export default function LegacyMigrationPage() {
	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-2xl">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
						<AlertTriangle className="h-16 w-16 text-yellow-600" />
					</div>
					<CardTitle className="text-2xl">Legacy Version Detected</CardTitle>
					<CardDescription className="mt-2 text-lg">
						You're updating from the legacy version of the app
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="rounded-lg border border-red-800 bg-red-950 p-4">
						<p className="text-sm text-red-400">
							<strong>Important:</strong> This version is not compatible with
							your existing database. You have two options to continue:
						</p>
					</div>

					<div className="space-y-4">
						<div className="rounded-lg border p-4">
							<h3 className="mb-2 font-semibold">
								Option 1: Continue with Legacy Version
							</h3>
							<p className="mb-3 text-sm">
								To keep using your existing setup, change your Docker tag to
								&nbsp;
								<code className="h-fit rounded bg-white px-2 py-1 text-xs text-black">
									legacy
								</code>
							</p>
							<div className="rounded bg-white p-3 text-black">
								<code>docker pull lov432/next-openwrt-stats:legacy</code>
							</div>
						</div>

						<div className="rounded-lg border p-4">
							<h3 className="mb-2 font-semibold">
								Option 2: Migrate to New Version
							</h3>
							<p className="mb-3 text-sm">
								Visit GitHub repository to learn how to properly set up the new
								version.
							</p>
							<Button asChild variant="outline" className="w-full">
								<a
									href="https://github.com/lov432/next-openwrt-stats"
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center justify-center gap-2"
								>
									View Guide
									<ExternalLink className="h-4 w-4" />
								</a>
							</Button>
						</div>
					</div>

					<div className="border-t pt-4 text-center text-xs">
						<p>
							Need help? Check the documentation or open an issue on{' '}
							<a
								href="https://github.com/lov432/next-openwrt-stats"
								target="_blank"
								rel="noopener noreferrer"
								className="underline"
							>
								GitHub
							</a>
							.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
