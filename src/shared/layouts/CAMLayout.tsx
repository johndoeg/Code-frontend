import { Suspense } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { CamProvider } from '@/features/cam/contexts/CamContext';
import CAMTabs from '@/features/cam/components/CAMTabs';
import Modal from '@/shared/components/Modal';
import PageLoader from '@/shared/components/PageLoader';

export default function CAMLayout() {
	const navigate = useNavigate();

	return (
		<CamProvider>
			<Modal onClose={() => navigate(-1)} maxWidthClass="max-w-[98vw]">
				<div className="flex h-[92vh] bg-[var(--app-surface)] dark:bg-gray-900 rounded-lg overflow-hidden">
					<div className="flex-1 overflow-auto">
						<CAMTabs />
						<div className="p-6">
							<div className="bg-white dark:bg-gray-800 rounded shadow min-h-[70vh]">
								<Suspense fallback={<PageLoader />}>
									<Outlet />
								</Suspense>
							</div>
						</div>
					</div>
				</div>
			</Modal>
		</CamProvider>
	);
}