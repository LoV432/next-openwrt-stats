'use client';
import { useAtomValue } from 'jotai';
import { allSpeedStates } from '../../boundaries/SpeedBoundarie.client';
import { useEffect, useState } from 'react';
import { useSpring, animated } from '@react-spring/web';

export default function SpeedMeter({
	type,
	maxSpeed
}: {
	type: 'Upload' | 'Download';
	maxSpeed: number;
}) {
	const [springPercentage, setSpringPercentage] = useSpring(() => ({
		from: { '--percentage': 1 }
	}));
	const speed = useAtomValue(allSpeedStates);
	const [precentage, setPrecentage] = useState(0);
	const [mbpsInNumber, setMbpsInNumber] = useState(0);
	useEffect(() => {
		if (!speed[0].length) return;
		let mbpsInNumber =
			type === 'Upload' ? speed[1].totalMbpsUpload : speed[1].totalMbpsDownload;
		setMbpsInNumber(parseFloat(mbpsInNumber));
		let oldPercentage = precentage;
		let newPercentage = Math.round((parseFloat(mbpsInNumber) * 100) / maxSpeed);
		setPrecentage(newPercentage);
		setSpringPercentage.start({
			from: { '--percentage': oldPercentage },
			to: { '--percentage': newPercentage }
		});
	}, [speed]);
	return (
		<>
			<div className="w-5/6">
				{type}
				<p className="float-right inline-block">{mbpsInNumber} Mbps</p>
			</div>

			<animated.progress
				className="progress progress-error w-5/6"
				value={springPercentage['--percentage']}
				max="100"
			></animated.progress>
		</>
	);
}
