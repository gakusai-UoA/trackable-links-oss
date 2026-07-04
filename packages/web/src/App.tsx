import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { AuthProvider } from './components/AuthProvider';
import { PermissionGuard } from './components/PermissionGuard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Permissions } from './lib/permissions';
import { CreateProjectPage } from './pages/CreateProjectPage';
import { LoginPage } from './pages/LoginPage';
import { ManageProjectsPage } from './pages/ManageProjectsPage';
import { ProjectAnalyticsPage } from './pages/ProjectAnalyticsPage';
import { QRCodesPage } from './pages/QRCodesPage';

export default function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<Routes>
					<Route path="/login" element={<LoginPage />} />
					<Route
						path="/"
						element={
							<ProtectedRoute>
								<AppLayout>
									<PermissionGuard required={Permissions.TRACKABLE_LINKS_VIEW}>
										<ManageProjectsPage />
									</PermissionGuard>
								</AppLayout>
							</ProtectedRoute>
						}
					/>
					<Route
						path="/create"
						element={
							<ProtectedRoute>
								<AppLayout>
									<PermissionGuard required={Permissions.TRACKABLE_LINKS_EDIT}>
										<CreateProjectPage />
									</PermissionGuard>
								</AppLayout>
							</ProtectedRoute>
						}
					/>
					<Route
						path="/projects/:id/qrcodes"
						element={
							<ProtectedRoute>
								<AppLayout>
									<PermissionGuard required={Permissions.TRACKABLE_LINKS_VIEW}>
										<QRCodesPage />
									</PermissionGuard>
								</AppLayout>
							</ProtectedRoute>
						}
					/>
					<Route
						path="/projects/:id/analytics"
						element={
							<ProtectedRoute>
								<AppLayout>
									<PermissionGuard
										required={Permissions.TRACKABLE_LINKS_ANALYTICS}
									>
										<ProjectAnalyticsPage />
									</PermissionGuard>
								</AppLayout>
							</ProtectedRoute>
						}
					/>
				</Routes>
			</AuthProvider>
		</BrowserRouter>
	);
}
