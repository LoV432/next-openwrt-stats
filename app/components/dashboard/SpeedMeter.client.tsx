'use client';
import { useRecoilState } from 'recoil';
import { speedState } from '../boundaries/SpeedBoundarie.client';
import { useEffect, useState } from 'react';
import { useSpring, animated } from '@react-spring/web';

export default function SpeedMeter({ upload }: { upload: boolean }) {
	const [springPercentage, setSpringPercentage] = useSpring(() => ({
		from: { '--percentage': 1 }
	}));
	const [speed] = useRecoilState(speedState);
	const [precentage, setPrecentage] = useState(0);
	const [mbpsInNumber, setMbpsInNumber] = useState(1);
	useEffect(() => {
		let mbpsInNumber = upload
			? speed[1].totalMbpsUpload
			: speed[1].totalMbpsDownload;
		setMbpsInNumber(mbpsInNumber);
		let oldPercentage = precentage;
		let newPercentage = Math.round((mbpsInNumber * 100) / 40); // TODO: hardcoded max network speed value. Make dynamic
		setPrecentage(newPercentage);
		setSpringPercentage.start({
			from: { '--percentage': oldPercentage },
			to: { '--percentage': newPercentage }
		});
	}, [speed]);
	return (
		<>
			<p>{upload ? 'Upload:' : 'Download:'}</p>
			<animated.progress
				className="progress progress-error w-56"
				value={springPercentage['--percentage']}
				max="100"
			></animated.progress>
			<p className="sm:inline-block sm:pl-5">{mbpsInNumber} Mbps</p>
		</>
	);
}
