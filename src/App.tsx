import React from 'react';
import { Flame, RefreshCw } from 'lucide-react';
import { GameProvider, useGame } from '@/state/GameContext';
import { AppShell } from '@/components/layout/AppShell';
import { ToastLayer } from '@/components/layout/ToastLayer';
import { CharacterCreationModal } from '@/components/modals/CharacterCreationModal';
import { AuthModal } from '@/components/modals/AuthModal';
import { HomeView } from '@/components/views/HomeView';
import { ProfileView } from '@/components/views/ProfileView';
import { ArenaView } from '@/components/views/ArenaView';
import { ClickerView } from '@/components/views/ClickerView';
import { InventoryView } from '@/components/views/InventoryView';
import { ShopView } from '@/components/views/ShopView';
import { SkillsView } from '@/components/views/SkillsView';
import { UpgradesView } from '@/components/views/UpgradesView';
import { LeaderboardView } from '@/components/views/LeaderboardView';
import { MissionsView } from '@/components/views/MissionsView';
import { SettingsView } from '@/components/views/SettingsView';

const ActiveViewRenderer: React.FC = () => {
  const { activeView } = useGame();

  switch (activeView) {
    case 'home':
      return <HomeView />;
    case 'profile':
      return <ProfileView />;
    case 'arena':
      return <ArenaView />;
    case 'clicker':
      return <ClickerView />;
    case 'inventory':
      return <InventoryView />;
    case 'shop':
      return <ShopView />;
    case 'skills':
      return <SkillsView />;
    case 'upgrades':
      return <UpgradesView />;
    case 'leaderboard':
      return <LeaderboardView />;
    case 'missions':
      return <MissionsView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <HomeView />;
  }
};

const GameViewport: React.FC = () => {
  const { loading, bootError, fighter, retryBootstrap } = useGame();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: 20,
        }}
      >
        <div
          className="comic-card card-pad animate-pop"
          style={{ maxWidth: 380, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
        >
          <div
            className="brand-banner__emblem"
            style={{ width: 56, height: 56, borderRadius: 16 }}
          >
            <Flame size={30} />
          </div>
          <h1 style={{ fontSize: '1.6rem' }}>Brute Legends</h1>
          <p style={{ margin: 0, fontWeight: 800, color: 'var(--ink-muted)' }}>
            Préparation de l’arène et de ta brute chibi…
          </p>
        </div>
      </div>
    );
  }

  if (bootError || !fighter) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: 20,
        }}
      >
        <div
          className="comic-card card-pad"
          style={{ maxWidth: 440, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
        >
          <h1 style={{ fontSize: '1.45rem', color: '#b91c1c' }}>Connexion à l’arène interrompue</h1>
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--ink-body)' }}>
            {bootError || 'Impossible de charger ton combattant.'}
          </p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void retryBootstrap()}
          >
            <RefreshCw size={18} />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppShell>
        <ActiveViewRenderer />
      </AppShell>
      <CharacterCreationModal />
      <AuthModal />
      <ToastLayer />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <GameProvider>
      <GameViewport />
    </GameProvider>
  );
};

export default App;
