import React from "react";
import ReactDOM from "react-dom/client";
import App from '@/app/App';
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 2,
			gcTime: 1000 * 60 * 30,
			retry: (failureCount, error) => {
				const status = (error as { response?: { status?: number } })?.response?.status;
				if (status && status >= 400 && status < 500) return false;
				return failureCount < 2;
			},
			refetchOnWindowFocus: false,
		},
	},
});

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<App />
		</QueryClientProvider>
	</React.StrictMode>
);