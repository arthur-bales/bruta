import React, { useState } from 'react';
import { ShieldCheck, LogIn, UserPlus, LogOut, X, Database } from 'lucide-react';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';

export const AuthModal: React.FC = () => {
  const {
    user,
    storageMode,
    showAuthModal,
    setShowAuthModal,
    registerAccount,
    loginAccount,
    logoutToGuest,
  } = useGame();

  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!showAuthModal) return null;

  const isGuest = user?.isGuest ?? true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim();
    if (cleanUser.length < 3) {
      setError('Le pseudo doit contenir au moins 3 caractères.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'register') {
        await registerAccount({
          username: cleanUser,
          email: email.trim() || undefined,
          password,
        });
      } else {
        await loginAccount({
          username: cleanUser,
          password,
        });
      }
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d’authentification.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Compte & Sauvegarde Cloud"
      onClick={() => setShowAuthModal(false)}
    >
      <div className="modal-box" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={22} color="var(--accent-jade)" />
            <h2 style={{ fontSize: '1.35rem' }}>Compte & Sauvegarde</h2>
          </div>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => setShowAuthModal(false)}
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Card */}
        <div
          className="comic-card comic-card--warm card-pad"
          style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>
              {isGuest ? 'Session Invitée active' : `Connecté : ${user?.username}`}
            </strong>
            <span
              className="badge"
              style={{
                background: storageMode === 'postgres' ? '#dcfce7' : '#e0f2fe',
                color: 'var(--ink-strong)',
              }}
            >
              <Database size={12} />
              {storageMode === 'postgres' ? 'Neon PostgreSQL' : 'Stockage Local'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--ink-muted)', fontWeight: 700 }}>
            {isGuest
              ? 'Sécurise ton compte invité pour conserver ta progression sur tous tes appareils (PC & Mobile) !'
              : 'Ta brute, ton équipement et ton classement sont synchronisés automatiquement.'}
          </p>
        </div>

        {!isGuest ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                soundEngine.play('click');
                void logoutToGuest();
              }}
            >
              <LogOut size={18} />
              Se déconnecter (passer en invité)
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setShowAuthModal(false)}
            >
              Continuer à jouer
            </button>
          </div>
        ) : (
          <>
            <div className="tabs-bar">
              <button
                type="button"
                className={`tab-btn ${mode === 'register' ? 'tab-btn--active' : ''}`}
                style={{ flex: 1 }}
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
              >
                Sécuriser mon compte
              </button>
              <button
                type="button"
                className={`tab-btn ${mode === 'login' ? 'tab-btn--active' : ''}`}
                style={{ flex: 1 }}
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
              >
                Connexion
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label
                  htmlFor="auth-username"
                  style={{ display: 'block', fontWeight: 800, fontSize: '0.84rem', marginBottom: 4 }}
                >
                  Nom d’utilisateur
                </label>
                <input
                  id="auth-username"
                  type="text"
                  className="comic-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="PseudoUnique"
                  autoComplete="username"
                  required
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label
                    htmlFor="auth-email"
                    style={{ display: 'block', fontWeight: 800, fontSize: '0.84rem', marginBottom: 4 }}
                  >
                    Email (optionnel)
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    className="comic-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="toi@exemple.fr"
                    autoComplete="email"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-password"
                  style={{ display: 'block', fontWeight: 800, fontSize: '0.84rem', marginBottom: 4 }}
                >
                  Mot de passe
                </label>
                <input
                  id="auth-password"
                  type="password"
                  className="comic-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  required
                />
              </div>

              {error && (
                <div
                  style={{
                    padding: '9px 12px',
                    borderRadius: 12,
                    border: '2px solid #dc2626',
                    background: '#fee2e2',
                    color: '#991b1b',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn--primary btn--lg"
                disabled={submitting}
              >
                {mode === 'register' ? <UserPlus size={18} /> : <LogIn size={18} />}
                {submitting
                  ? 'Chargement…'
                  : mode === 'register'
                    ? 'Sauvegarder mon compte invité'
                    : 'Se connecter'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
