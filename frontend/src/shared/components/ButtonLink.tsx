import type { LinkProps } from "react-aria-components";
import { Link } from "react-aria-components";

import type { ButtonVariant } from "../services/button-style";
import { buttonClassName } from "../services/button-style";

type Props = Omit<LinkProps, "className" | "style"> & { variant: ButtonVariant };

export function ButtonLink({ variant, ...props }: Props) {
	return <Link {...props} className={buttonClassName(variant)} />;
}
