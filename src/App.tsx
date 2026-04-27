import { useState } from 'react';
import { AppProvider, useAppProfile } from './context/AppContext';
import { LoginPage }    from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

// ─── AppRoot runs inside AppProvider so it can call useApp() ─────────────────
function AppRoot() {
  const [entered, setEntered] = useState(false);
  const { updateProfile }    = useAppProfile();

  const handleEnter = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    updateProfile({ name: trimmed });
    setEntered(true);
  };

  return entered ? <DashboardPage /> : <LoginPage onEnter={handleEnter} />;
}

export default function App() {
  return (
    <AppProvider>
      <AppRoot />
    </AppProvider>
  );
}
