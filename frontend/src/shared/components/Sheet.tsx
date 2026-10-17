import { clsx } from "clsx";
import type { ReactNode } from "react";
import { Modal, ModalOverlay } from "react-aria-components";

import { SheetPanel } from "./SheetPanel";

type Props = {
	/** DialogTrigger や MenuTrigger の中で使うときは省略し、開閉をそちらに任せる。 */
	isOpen?: boolean;
	onOpenChange?: (isOpen: boolean) => void;
	/** 背後を見せたいもの（再生中の映像など）では false にする。 */
	blurBackdrop: boolean;
	children: ReactNode;
};

/** 狭い画面では下から出るシート、sm 以上では中央のダイアログになる。 */
export function Sheet({ isOpen, onOpenChange, blurBackdrop, children }: Props) {
	return (
		<ModalOverlay
			{...(isOpen === undefined ? {} : { isOpen })}
			{...(onOpenChange === undefined ? {} : { onOpenChange })}
			isDismissable
			className={clsx(
				"fixed inset-0 z-modal flex items-end justify-center bg-scrim/70 transition-opacity duration-300 ease-out data-entering:opacity-0 data-exiting:opacity-0 data-exiting:duration-200 sm:items-center sm:p-4",
				blurBackdrop && "backdrop-blur-sm",
			)}
		>
			<Modal className="w-full transition duration-300 ease-out outline-none data-entering:translate-y-full data-exiting:translate-y-full data-exiting:duration-200 data-exiting:ease-in sm:w-[min(40rem,100%)] sm:data-entering:translate-y-4 sm:data-entering:scale-95 sm:data-entering:opacity-0 sm:data-exiting:translate-y-0 sm:data-exiting:scale-95 sm:data-exiting:opacity-0">
				<SheetPanel>{children}</SheetPanel>
			</Modal>
		</ModalOverlay>
	);
}
