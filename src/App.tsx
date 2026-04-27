import { AppProvider } from './context/AppContext';
import { DashboardPage } from './pages/DashboardPage';

export default function App() {
  return (
    <AppProvider>
      <DashboardPage />
    </AppProvider>
  );
}
