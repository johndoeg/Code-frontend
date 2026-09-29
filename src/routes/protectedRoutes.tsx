import { lazy } from "react";
import { Route } from "react-router-dom";
import { ALL_ROUTE_TUPLES } from "./routeConfig";

export const PROTECTED_ROUTE_ELEMENTS = ALL_ROUTE_TUPLES.map(([path, importFn]) => {
	const Component = lazy(importFn);
	return <Route key={path} path={path} element={<Component />} />;
});

const routeImportMap = new Map(ALL_ROUTE_TUPLES);
const prefetchedPaths = new Set<string>();
const prefetchPromises = new Map<string, Promise<unknown> | undefined>();

export function prefetchRoute(path: string) {
	if (prefetchedPaths.has(path)) return prefetchPromises.get(path);
	const importFn = routeImportMap.get(path);
	if (!importFn) return undefined;

	prefetchedPaths.add(path);
	const promise = importFn().catch(() => {
		prefetchedPaths.delete(path);
	});
	prefetchPromises.set(path, promise);
	return promise;
}