import { Separator } from '@/components/ui/separator';

export default function SeparatorWithText({ text }: { text: string }) {
	return (
		<div className="my-4 flex items-center gap-4">
			<Separator className="flex-1" />
			<span className="text-muted-foreground">{text}</span>
			<Separator className="flex-1" />
		</div>
	);
}
