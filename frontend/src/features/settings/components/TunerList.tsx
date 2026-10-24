import type { Channel, Tuner } from "@moontv/core/api/schemas";
import { describeTunerUser, tunerTypesLabel } from "@moontv/core/services/tuner-usage";
import { clsx } from "clsx";

type Props = {
	tuners: readonly Tuner[];
	channelById: ReadonlyMap<number, Channel>;
};

export function TunerList({ tuners, channelById }: Props) {
	if (tuners.length === 0) {
		return <p className="p-4 text-label text-fg-muted">mirakc にチューナーがありません。</p>;
	}
	return (
		<ul className="divide-y divide-line">
			{tuners.map((tuner) => {
				const using = tuner.users.length > 0;
				return (
					<li key={tuner.index} className="flex flex-col gap-3 px-4 py-3">
						<div className="flex items-center justify-between gap-4">
							<div className="flex min-w-0 flex-col gap-0.5">
								<span className="truncate text-label text-fg">{tuner.name}</span>
								<span className="text-caption text-fg-muted">{tunerTypesLabel(tuner)}</span>
							</div>
							<span
								className={clsx(
									"shrink-0 text-caption-strong",
									using ? "text-fg-accent" : "text-fg-subtle",
								)}
							>
								{using ? "使用中" : "空き"}
							</span>
						</div>
						{using && (
							<ul className="flex flex-col gap-2">
								{tuner.users.map((user) => {
									const usage = describeTunerUser(user, channelById);
									return (
										<li key={user.id} className="flex items-baseline gap-3">
											<span className="w-12 shrink-0 text-caption-strong text-fg-muted">
												{usage.purpose}
											</span>
											<div className="flex min-w-0 flex-col gap-0.5">
												<span className="truncate text-label text-fg-secondary">{usage.title}</span>
												{usage.detail != null && (
													<span className="text-caption text-fg-muted tabular-nums">
														{usage.detail}
													</span>
												)}
											</div>
										</li>
									);
								})}
							</ul>
						)}
					</li>
				);
			})}
		</ul>
	);
}
