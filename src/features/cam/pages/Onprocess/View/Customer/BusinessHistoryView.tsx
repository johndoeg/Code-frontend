import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import type { CamCtx } from '@/features/cam/pages/Onprocess/View/MainView/CamViewTabs';
import LoadingCard from '@/features/cam/components/LoadingCard';
import ErrorCard from '@/features/cam/components/ErrorCard';
import NoDataCard from '@/features/cam/components/NoDataCard';

interface HistoryRow {
	from: string;
	until: string;
	company: string;
	company_address: string;
	kabupaten: string;
	propinsi: string;
	postcode: string;
	employee_id: string;
	position: string;
	phone: string;
}

interface BusinessHistoryData {
	lessee_cat: string;
	show_employee_id: boolean;
	history: HistoryRow[];
	no_data: boolean;
}

export default function BusinessHistoryView({ ctx }: { ctx: CamCtx }) {
	const { data, isLoading, isError } = useQuery({
		queryKey: ['cam-business-history', ctx.apless],
		queryFn: async () => {
			const res = await api.get<BusinessHistoryData>('/CAM/View/business-history', {
				params: { apless: ctx.apless },
			});
			return res.data;
		},
	});

	if (isLoading) {
		return <LoadingCard message="Loading business history…" />;
	}
	if (isError || !data) {
		return <ErrorCard message="Failed to load business history." />;
	}
	if (data.no_data) {
		return <NoDataCard />;
	}

	return (
		<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow">
			<div className="border-b border-[var(--app-border)] bg-slate-800 px-5 py-2.5">
				<h2 className="text-center text-sm font-bold uppercase tracking-wide text-white">Business / Job History</h2>
			</div>
			<div className="overflow-x-auto p-5">
				<table className="w-full min-w-[900px] border-collapse text-sm">
					<thead>
						<tr className="bg-slate-800 text-left text-xs uppercase tracking-wide text-white">
							<th className="border border-[var(--app-border)] px-3 py-2">No.</th>
							<th className="border border-[var(--app-border)] px-3 py-2">From</th>
							<th className="border border-[var(--app-border)] px-3 py-2">Until</th>
							<th className="border border-[var(--app-border)] px-3 py-2">Company Name</th>
							<th className="border border-[var(--app-border)] px-3 py-2">Company Address</th>
							<th className="border border-[var(--app-border)] px-3 py-2">District / City</th>
							<th className="border border-[var(--app-border)] px-3 py-2">Province</th>
							<th className="border border-[var(--app-border)] px-3 py-2">Post Code</th>
							{data.show_employee_id && <th className="border border-[var(--app-border)] px-3 py-2">Employee ID No.</th>}
							<th className="border border-[var(--app-border)] px-3 py-2">Position</th>
							<th className="border border-[var(--app-border)] px-3 py-2">Phone</th>
						</tr>
					</thead>
					<tbody>
						{data.history.map((row, i) => (
							<tr key={i}>
								<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-muted)]">{i + 1}</td>
								<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{row.from}</td>
								<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{row.until}</td>
								<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{row.company}</td>
								<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{row.company_address}</td>
								<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{row.kabupaten}</td>
								<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{row.propinsi}</td>
								<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{row.postcode}</td>
								{data.show_employee_id && (
									<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{row.employee_id}</td>
								)}
								<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{row.position}</td>
								<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{row.phone}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}