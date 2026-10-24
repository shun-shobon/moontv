import { channelTypeLabel } from "@moontv/core/domain/channel-type";

import { SegmentedControl } from "../../../shared/components/SegmentedControl";

type Props = {
	types: readonly string[];
	current: string | undefined;
	onSelect: (type: string) => void;
};

export function ChannelTypeTabs({ types, current, onSelect }: Props) {
	return (
		<SegmentedControl
			label="放送波"
			options={types}
			value={current}
			format={channelTypeLabel}
			onChange={onSelect}
			className="flex gap-1"
		/>
	);
}
