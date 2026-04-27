import { useState } from 'react';
import { AppProvider, useAppProfile } from './context/AppContext';
import { LoginPage }    from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

function AppRoot() {
  const { profile, updateProfile } = useAppProfile();

  // Skip login if a name was already persisted from a previous session
  const [entered, setEntered] = useState(() => !!profile.name.trim());

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
