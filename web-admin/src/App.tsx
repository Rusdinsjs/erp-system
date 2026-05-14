// Main App with Router - Pure Tailwind Version
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/useAuthStore';
import { lazy, Suspense } from 'react';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { PageLoading } from './components/ui';

import { ThemeProvider } from './contexts/ThemeContext';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Launchpad = lazy(() => import('./pages/Launchpad'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => !!state.token);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// Redirect everyone to the Launchpad Portal first
function HomeRedirect() {
  return <Navigate to="/launchpad" replace />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <WebSocketProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoading />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                {/* Launchpad - Full screen menu for non-super-admin users */}
                <Route
                  path="/launchpad"
                  element={
                    <PrivateRoute>
                      <Launchpad />
                    </PrivateRoute>
                  }
                />

                {/* Home redirect - decides where to go based on role */}
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <HomeRedirect />
                    </PrivateRoute>
                  }
                />

                {/* Main Dashboard with Tab Navigation - handles all internal routes */}
                <Route
                  path="/*"
                  element={
                    <PrivateRoute>
                      <AdminDashboard />
                    </PrivateRoute>
                  }
                />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </WebSocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

