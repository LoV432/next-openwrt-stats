'use client';

import { RecoilRoot } from 'recoil';

export default function RecoilWrapper({
	children
}: {
	children: React.ReactNode;
}) {
	return <RecoilRoot>{children}</RecoilRoot>;
}
