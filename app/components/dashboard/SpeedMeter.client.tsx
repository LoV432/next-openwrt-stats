'use client';
import { useRecoilState } from 'recoil';
import { allSpeedStates } from '../boundaries/SpeedBoundarie.client';
import { useEffect, useState } from 'react';
import { useSpring, animated } from '@react-spring/web';

export default function SpeedMeter({ upload }: { upload: boolean }) {
	const [springPercentage, setSpringPercentage] = useSpring(() => ({
		from: { '--percentage': 1 }
	}));
	const [speed] = useRecoilState(allSpeedStates);
	const [precentage, setPrecentage] = useState(0);
	const [mbpsInNumber, setMbpsInNumber] = useState(0);
	useEffect(() => {
		if (!speed[0].length) return;
		let mbpsInNumber = upload
			? speed[1].totalMbpsUpload
			: speed[1].totalMbpsDownload;
		setMbpsInNumber(parseFloat(mbpsInNumber));
		let oldPercentage = precentage;
		let newPercentage = Math.round((parseFloat(mbpsInNumber) * 100) / 40); // TODO: hardcoded max network speed value. Make dynamic
		setPrecentage(newPercentage);
		setSpringPercentage.start({
			from: { '--percentage': oldPercentage },
			to: { '--percentage': newPercentage }
		});
	}, [speed]);
	return (
		<>
			<div className="w-5/6">
				{upload ? 'Upload:' : 'Download:'}
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
