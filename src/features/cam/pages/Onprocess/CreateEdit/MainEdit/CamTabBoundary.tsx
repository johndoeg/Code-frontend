import React from 'react';

interface Props {
	children: React.ReactNode;
	onRetry?: () => void;
}
interface State {
	error: Error | null;
}

export default class CamTabBoundary extends React.Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.error('CAM tab crashed:', error, info);
	}

	render() {
		if (this.state.error) {
			return (
				<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
					<p className="text-base font-medium text-red-600">This tab failed to load</p>
					<p className="mt-1 break-words text-sm text-[var(--app-muted)]">
						{this.state.error.message || String(this.state.error)}
					</p>
					<button
						type="button"
						onClick={() => {
							this.setState({ error: null });
							this.props.onRetry?.();
						}}
						className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
					>
						Retry
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}