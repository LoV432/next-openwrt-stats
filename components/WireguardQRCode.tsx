'use client';

import { useEffect, useState } from 'react';
import { toDataURL } from 'qrcode';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from './ui/dialog';
import { QrCodeIcon } from 'lucide-react';
import { WireguardPeer } from '@/lib/server/routerInterfaces';

interface WireguardQRCodeProps {
	peer: WireguardPeer;
	interfaceData: {
		public_key: string;
		listen_port: string;
	};
}

export default function WireguardQRCode({
	peer,
	interfaceData
}: WireguardQRCodeProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
	const [qrEndpoint, setQrEndpoint] = useState('');
	const [qrAddress, setQrAddress] = useState(peer.allowed_ips?.[0] || '');
	const [qrDns, setQrDns] = useState('192.168.1.1');
	const [qrAllowedIps, setQrAllowedIps] = useState('0.0.0.0/0, ::/0');

	async function generateQRCode() {
		try {
			const config = `
[Interface]
${qrAddress ? `Address = ${qrAddress}` : ''}
PrivateKey = ${peer.private_key}
${qrDns ? `DNS = ${qrDns}` : ''}

[Peer]
PublicKey = ${interfaceData.public_key}
${peer.preshared_key ? `PresharedKey = ${peer.preshared_key}` : ''}
${qrAllowedIps ? `AllowedIPs = ${qrAllowedIps}` : ''}
${qrEndpoint ? `Endpoint = ${qrEndpoint}` : ''}`;

			const url = await toDataURL(config);
			setQrCodeUrl(url);
		} catch (err) {
			console.error('Failed to generate QR code:', err);
		}
	}

	useEffect(() => {
		const generateQRCodeDebounced = setTimeout(generateQRCode, 500);
		return () => clearTimeout(generateQRCodeDebounced);
	}, [qrAllowedIps, qrAddress, qrDns, qrEndpoint, isOpen]);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<QrCodeIcon className="h-3 w-3" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Generate QR Code</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="endpoint" className="text-right">
							Endpoint
						</Label>
						<Input
							id="endpoint"
							value={qrEndpoint}
							onChange={(e) => setQrEndpoint(e.target.value)}
							className="col-span-3"
							placeholder="your.domain.com:port"
						/>
					</div>
					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="address" className="text-right">
							Address
						</Label>
						<Input
							id="address"
							value={qrAddress}
							onChange={(e) => setQrAddress(e.target.value)}
							className="col-span-3"
							placeholder="10.0.0.2/24"
						/>
					</div>
					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="dns" className="text-right">
							DNS
						</Label>
						<Input
							id="dns"
							value={qrDns}
							onChange={(e) => setQrDns(e.target.value)}
							className="col-span-3"
							placeholder="1.1.1.1"
						/>
					</div>
					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="allowedIps" className="text-right">
							Allowed IPs
						</Label>
						<Input
							id="allowedIps"
							value={qrAllowedIps}
							onChange={(e) => setQrAllowedIps(e.target.value)}
							className="col-span-3"
							placeholder="0.0.0.0/0"
						/>
					</div>
					{qrCodeUrl && (
						<div className="flex justify-center">
							<img src={qrCodeUrl} alt="WireGuard QR Code" />
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
