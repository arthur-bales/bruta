import React, { useState } from 'react';
import {
  Home,
  User,
  Swords,
  Hand,
  Backpack,
  ShoppingBag,
  Sparkles,
  Hammer,
  Trophy,
  Gift,
  Settings,
  Menu,
  X,
  Flame,
} from 'lucide-react';
import type { ActiveView } from '@shared/types';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';
import { TopHud } from './TopHud';

interface NavItem {
  id: ActiveView;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Accueil', shortLabel: 'Accueil', icon: <Home size={19} /> },
  { id: 'arena', label: 'Arène', shortLabel: 'Arène', icon: <Swords size={19} /> },
  { id: 'clicker', label: 'Clicker Dojo', shortLabel: 'Clicker', icon: <Hand size={19} /> },
  { id: 'inventory', label: 'Inventaire', shortLabel: 'Sac', icon: <Backpack size={19} /> },
  { id: 'profile', label: 'Profil & Stats', shortLabel: 'Profil', icon: <User size={19} /> },
  { id: 'shop', label: 'Boutique', shortLabel: 'Boutique', icon: <ShoppingBag size={19} /> },
  { id: 'skills', label: 'Compétences', shortLabel: 'Skills', icon: <Sparkles size={19} /> },
  { id: 'upgrades', label: 'Améliorations', shortLabel: 'Dojo+', icon: <Hammer size={19} /> },
  { id: 'leaderboard', label: 'Classements', shortLabel: 'Top PvP', icon: <Trophy size={19} /> },
  { id: 'missions', label: 'Missions & Quotidien', shortLabel: 'Missions', icon: <Gift size={19} /> },
  { id: 'settings', label: 'Paramètres', shortLabel: 'Options', icon: <Settings size={19} /> },
];

const MOBILE_PRIMARY_VIEWS: ActiveView[] = ['home', 'arena', 'clicker', 'inventory'];
const MOBILE_DRAWER_VIEWS: ActiveView[] = [
  'profile',
  'shop',
  'skills',
  'upgrades',
  'leaderboard',
  'missions',
  'settings',
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeView, setActiveView, fighter, claimableMissionsCount } = useGame();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const statPoints = fighter?.statPoints ?? 0;

  const getBadgeCount = (view: ActiveView): number => {
    if (view === 'profile' && statPoints > 0) return statPoints;
    if (view === 'missions' && claimableMissionsCount > 0) return claimableMissionsCount;
    return 0;
  };

  const drawerHasNotifications = statPoints > 0 || claimableMissionsCount > 0;
  const isDrawerViewActive = MOBILE_DRAWER_VIEWS.includes(activeView);

  const handleNavigate = (view: ActiveView) => {
    soundEngine.play('click');
    setActiveView(view);
    setDrawerOpen(false);
  };

  return (
    <div className="app-shell">
      {/* PC Left Sidebar Rail (>= 1024px) */}
      <aside className="pc-sidebar" aria-label="Navigation principale">
        <div
          className="brand-banner"
          role="button"
          tabIndex={0}
          onClick={() => handleNavigate('home')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleNavigate('home');
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="brand-banner__emblem">
            <Flame size={22} />
          </div>
          <div>
            <div className="brand-banner__title">Brute Legends</div>
            <div className="brand-banner__sub">Arène Chibi RPG</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {ALL_NAV_ITEMS.map((item) => {
            const badge = getBadgeCount(item.id);
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-btn ${active ? 'sidebar-btn--active' : ''}`}
                onClick={() => handleNavigate(item.id)}
                aria-current={active ? 'page' : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
                {badge > 0 && <span className="sidebar-btn__badge">{badge}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Column */}
      <div className="app-main">
        <TopHud />
        <main className="view-container">{children}</main>
      </div>

      {/* Mobile Fixed Bottom Nav (< 1024px) */}
      <nav className="mobile-nav" aria-label="Navigation mobile">
        {MOBILE_PRIMARY_VIEWS.map((viewId) => {
          const item = ALL_NAV_ITEMS.find((i) => i.id === viewId)!;
          const active = activeView === viewId && !drawerOpen;
          return (
            <button
              key={item.id}
              type="button"
              className={`mobile-nav__btn ${active ? 'mobile-nav__btn--active' : ''}`}
              onClick={() => handleNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
            >
              {item.icon}
              <span>{item.shortLabel}</span>
            </button>
          );
        })}

        <button
          type="button"
          className={`mobile-nav__btn ${drawerOpen || isDrawerViewActive ? 'mobile-nav__btn--active' : ''}`}
          onClick={() => {
            soundEngine.play('click');
            setDrawerOpen((prev) => !prev);
          }}
          aria-expanded={drawerOpen}
        >
          {drawerOpen ? <X size={19} /> : <Menu size={19} />}
          <span>Menu</span>
          {drawerHasNotifications && <span className="mobile-nav__dot" aria-hidden="true" />}
        </button>
      </nav>

      {/* Mobile Slide-Up Menu Drawer */}
      {drawerOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Menu du Dojo"
        >
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Flame size={20} color="var(--accent-flame)" />
                <h3 style={{ fontSize: '1.15rem' }}>Menu du Dojo</h3>
              </div>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fermer le menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mobile-drawer__grid">
              {MOBILE_DRAWER_VIEWS.map((viewId) => {
                const item = ALL_NAV_ITEMS.find((i) => i.id === viewId)!;
                const badge = getBadgeCount(viewId);
                const active = activeView === viewId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`btn ${active ? 'btn--primary' : ''}`}
                    style={{
                      justifyContent: 'flex-start',
                      padding: '10px 12px',
                      minHeight: 48,
                      fontSize: '0.9rem',
                    }}
                    onClick={() => handleNavigate(item.id)}
                  >
                    {item.icon}
                    <span style={{ flex: 1, textAlign: 'left' }}>{item.shortLabel}</span>
                    {badge > 0 && (
                      <span
                        className="badge"
                        style={{
                          background: '#ffd152',
                          color: 'var(--ink-strong)',
                          fontSize: '0.7rem',
                          padding: '1px 6px',
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
