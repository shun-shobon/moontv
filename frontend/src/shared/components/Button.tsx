import type { ButtonProps } from "react-aria-components";
import { Button as AriaButton } from "react-aria-components";

import type { ButtonVariant } from "../services/button-style";
import { buttonClassName } from "../services/button-style";

type Props = Omit<ButtonProps, "className" | "style"> & { variant: ButtonVariant };

export function Button({ variant, ...props }: Props) {
	return <AriaButton {...props} className={buttonClassName(variant)} />;
}
