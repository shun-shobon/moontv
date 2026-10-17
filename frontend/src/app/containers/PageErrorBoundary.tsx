import { Component } from "react";
import type { ReactNode } from "react";

type Props = { page: ReactNode; fallback: ReactNode };
type State = { page: ReactNode; failed: boolean };

/** 描画中の例外でアプリ全体が消えないよう、ページだけを差し替える。別のページへ移ったら戻す。 */
export class PageErrorBoundary extends Component<Props, State> {
	override state: State = { page: this.props.page, failed: false };

	static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
		return props.page === state.page ? null : { page: props.page, failed: false };
	}

	static getDerivedStateFromError(): Partial<State> {
		return { failed: true };
	}

	override render() {
		return this.state.failed ? this.props.fallback : this.props.page;
	}
}
