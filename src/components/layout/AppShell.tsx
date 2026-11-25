import React, { useState } from 'react';
import {
  Swords,
  Backpack,
  ShoppingBag,
  Sparkles,
  Hammer,
  Trophy,
  Gift,
  Settings,
  Menu,
  X,
  Hand,
  User,
  Home,
} from 'lucide-react';
import type { ActiveView } from '@shared/types';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';
import { AI_HERO_POSES, AI_RIVALS } from '@/engine/art/aiAssets';
import { TopHud } from './TopHud';

/** The three big "My Brute" tabs. Each one groups several views. */
interface MainTab {
  id: 'cellule' | 'arene' | 'arsenal';
  label: string;
  sub: string;
  target: ActiveView;
  views: ActiveView[];
}

const MAIN_TABS: MainTab[] = [
  {
    id: 'cellule',
    label: 'Cellule',
    sub: 'Entraînement',
    target: 'home',
    views: ['home', 'profile', 'clicker', 'upgrades'],
  },
  {
    id: 'arene',
    label: 'Arène',
    sub: 'Combats',
    target: 'arena',
    views: ['arena'],
  },
  {
    id: 'arsenal',
    label: 'Arsenal',
    sub: 'Équipement',
    target: 'inventory',
    views: ['inventory', 'skills'],
  },
];

interface SubLink {
  id: ActiveView;
  label: string;
  icon: React.ReactNode;
}

const ALL_LINKS: SubLink[] = [
  { id: 'home', label: 'Ma cellule', icon: <Home size={16} /> },
  { id: 'profile', label: 'Profil', icon: <User size={16} /> },
  { id: 'clicker', label: 'Dojo (clic)', icon: <Hand size={16} /> },
  { id: 'upgrades', label: 'Améliorations', icon: <Hammer size={16} /> },
  { id: 'arena', label: 'Combats', icon: <Swords size={16} /> },
  { id: 'leaderboard', label: 'Classement', icon: <Trophy size={16} /> },
  { id: 'inventory', label: 'Inventaire', icon: <Backpack size={16} /> },
  { id: 'shop', label: 'Boutique', icon: <ShoppingBag size={16} /> },
  { id: 'skills', label: 'Compétences', icon: <Sparkles size={16} /> },
  { id: 'missions', label: 'Missions', icon: <Gift size={16} /> },
  { id: 'settings', label: 'Options', icon: <Settings size={16} /> },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeView, setActiveView, fighter, claimableMissionsCount } = useGame();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const statPoints = fighter?.statPoints ?? 0;
  const currentTab = MAIN_TABS.find((t) => t.views.includes(activeView));

  const getBadgeCount = (view: ActiveView): number => {
    if (view === 'profile' && statPoints > 0) return statPoints;
    if (view === 'missions' && claimableMissionsCount > 0) return claimableMissionsCount;
    return 0;
  };

  const tabBadge = (tab: MainTab) => tab.views.reduce((sum, v) => sum + getBadgeCount(v), 0);

  const handleNavigate = (view: ActiveView) => {
    soundEngine.play('click');
    setActiveView(view);
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const subLinks = currentTab
    ? ALL_LINKS.filter((l) => currentTab.views.includes(l.id))
    : [];

  return (
    <div className="app-shell">
      <div className="mb-page">
        {/* ---------- PC banner with logo & mascots ---------- */}
        <header className="mb-banner" aria-label="Brute Legends">
          <img className="mb-banner__mascot mb-banner__mascot--left" src={AI_HERO_POSES.victory} alt="" aria-hidden="true" />
          <button
            type="button"
            className="mb-banner__logo-btn"
            onClick={() => handleNavigate('home')}
            aria-label="Retour à la cellule"
          >
            <img className="mb-banner__logo" src="/assets/ui/logo.webp" alt="Brute Legends" />
          </button>
          <div className="mb-banner__tagline">Règle tes comptes dans l’arène !</div>
          <img className="mb-banner__mascot mb-banner__mascot--right" src={AI_RIVALS.kitsune.url} alt="" aria-hidden="true" />
        </header>

        {/* ---------- PC tab plaques ---------- */}
        <nav className="mb-tabs" aria-label="Navigation principale">
          {MAIN_TABS.map((tab) => {
            const active = currentTab?.id === tab.id;
            const badge = tabBadge(tab);
            return (
              <button
                key={tab.id}
                type="button"
                className={`mb-tab ${active ? 'mb-tab--active' : ''}`}
                onClick={() => handleNavigate(tab.target)}
                aria-current={active ? 'page' : undefined}
              >
                <span className="mb-tab__label">{tab.label}</span>
                <span className="mb-tab__sub">{tab.sub}</span>
                {badge > 0 && <span className="mb-tab__badge">{badge}</span>}
              </button>
            );
          })}
          <div className="mb-tabs__extra">
            {(['shop', 'leaderboard', 'missions', 'settings'] as ActiveView[]).map((id) => {
              const link = ALL_LINKS.find((l) => l.id === id)!;
              const badge = getBadgeCount(id);
              return (
                <button
                  key={id}
                  type="button"
                  className={`mb-mini-tab ${activeView === id ? 'mb-mini-tab--active' : ''}`}
                  onClick={() => handleNavigate(id)}
                  title={link.label}
                >
                  {link.icon}
                  <span>{link.label}</span>
                  {badge > 0 && <span className="mb-tab__badge mb-tab__badge--mini">{badge}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        {/* ---------- Status plaque (name, level, XP, gold) ---------- */}
        <TopHud />

        {/* ---------- Sub navigation inside the current tab ---------- */}
        {subLinks.length > 1 && (
          <div className="mb-subnav" role="tablist" aria-label="Sections">
            {subLinks.map((link) => {
              const badge = getBadgeCount(link.id);
              return (
                <button
                  key={link.id}
                  type="button"
                  role="tab"
                  aria-selected={activeView === link.id}
                  className={`mb-subnav__btn ${activeView === link.id ? 'mb-subnav__btn--active' : ''}`}
                  onClick={() => handleNavigate(link.id)}
                >
                  {link.icon}
                  <span>{link.label}</span>
                  {badge > 0 && <span className="mb-tab__badge mb-tab__badge--mini">{badge}</span>}
                </button>
              );
            })}
          </div>
        )}

        <main className="view-container" key={activeView}>
          {children}
        </main>
      </div>

      {/* ---------- Mobile bottom nav: 3 big tabs + menu ---------- */}
      <nav className="mobile-nav" aria-label="Navigation mobile">
        {MAIN_TABS.map((tab) => {
          const active = currentTab?.id === tab.id && !drawerOpen;
          const badge = tabBadge(tab);
          return (
            <button
              key={tab.id}
              type="button"
              className={`mobile-nav__btn ${active ? 'mobile-nav__btn--active' : ''}`}
              onClick={() => handleNavigate(tab.target)}
              aria-current={active ? 'page' : undefined}
            >
              <strong>{tab.label}</strong>
              <span>{tab.sub}</span>
              {badge > 0 && <span className="mobile-nav__dot" aria-hidden="true" />}
            </button>
          );
        })}
        <button
          type="button"
          className={`mobile-nav__btn mobile-nav__btn--menu ${drawerOpen || !currentTab ? 'mobile-nav__btn--active' : ''}`}
          onClick={() => {
            soundEngine.play('click');
            setDrawerOpen((prev) => !prev);
          }}
          aria-expanded={drawerOpen}
          aria-label="Plus de menus"
        >
          {drawerOpen ? <X size={22} /> : <Menu size={22} />}
          {claimableMissionsCount > 0 && <span className="mobile-nav__dot" aria-hidden="true" />}
        </button>
      </nav>

      {drawerOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Tous les menus"
        >
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer__header">
              <h3 className="mb-section-title">Tous les menus</h3>
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
              {ALL_LINKS.map((link) => {
                const badge = getBadgeCount(link.id);
                const active = activeView === link.id;
                return (
                  <button
                    key={link.id}
                    type="button"
                    className={`mb-drawer-link ${active ? 'mb-drawer-link--active' : ''}`}
                    onClick={() => handleNavigate(link.id)}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                    {badge > 0 && <span className="mb-tab__badge mb-tab__badge--mini">{badge}</span>}
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
