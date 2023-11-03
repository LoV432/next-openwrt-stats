export default function DashboardCardBase({
	children,
	backgroundColor
}: {
	children: React.ReactNode;
	backgroundColor: string;
}) {
	return (
		<div className={`card w-full sm:w-96 ${backgroundColor}`}>
			<div className="card-body justify-center">{children}</div>
		</div>
	);
}
