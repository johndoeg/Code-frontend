import "react-datepicker/dist/react-datepicker.css";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from '@/shared/contexts/AuthContext';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import MaintenanceGate from '@/shared/components/MaintenanceGate';
import AppRoutes from "./AppRoutes";

export default function App() {
	return (
		<MaintenanceGate>
			<ThemeProvider>
				<AuthProvider>
					<MemoryRouter>
						<AppRoutes />
					</MemoryRouter>
				</AuthProvider>
			</ThemeProvider>
		</MaintenanceGate>
	);
}