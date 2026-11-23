import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("auth/initial", "routes/auth/auth-initial.tsx"),
	route("auth/final", "routes/auth/auth-final.tsx"),

	route(
		"product-groups",
		"routes/product-groups/_index.tsx"
	),
	route(
		"product-groups/new",
		"routes/product-groups/new.tsx"
	),
	route(
		"product-groups/edit/:id",
		"routes/product-groups/edit.$id.tsx"
	),
] satisfies RouteConfig;
