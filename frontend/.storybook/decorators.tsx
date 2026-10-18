import "@videojs/react/i18n/locales/ja/register";
import type { Decorator } from "@storybook/react-vite";
import { Container } from "@videojs/react";
import { I18nProvider } from "@videojs/react/i18n";
import { LiveVideoPlayer } from "@videojs/react/live-video";

export const withLivePlayer: Decorator = (Story) => (
	<I18nProvider locale="ja">
		<LiveVideoPlayer>
			<div className="max-w-3xl">
				<Story />
			</div>
		</LiveVideoPlayer>
	</I18nProvider>
);

/** Container は LiveVideoPlayer の文脈を要するため、withLivePlayer の内側で使う。 */
export const withPlayerFrame: Decorator = (Story) => (
	<Container className="relative aspect-video w-full overflow-hidden bg-video">
		<Story />
	</Container>
);
