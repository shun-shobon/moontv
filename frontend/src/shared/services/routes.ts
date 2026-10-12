import UniversalRouterSync from "universal-router/sync";
import * as v from "valibot";

export type Route = { name: "home" } | { name: "watch"; serviceId: number } | { name: "guide" };

const ServiceIdSchema = v.pipe(v.string(), v.digits(), v.transform(Number));

const HOME: Route = { name: "home" };

const router = new UniversalRouterSync<Route>(
	[
		{ path: "/", action: () => HOME },
		{ path: "/guide", action: () => ({ name: "guide" }) },
		{
			path: "/watch/:serviceId",
			action: (_, params) => {
				const parsed = v.safeParse(ServiceIdSchema, params["serviceId"]);
				return parsed.success ? { name: "watch", serviceId: parsed.output } : HOME;
			},
		},
	],
	{ errorHandler: () => HOME },
);

export const resolveRoute = (pathname: string): Route => router.resolve(pathname) ?? HOME;

export const watchPath = (serviceId: number) => `/watch/${serviceId}`;
