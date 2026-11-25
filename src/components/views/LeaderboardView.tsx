import React, { useCallback, useEffect, useState } from 'react';
import { Trophy, Swords, RefreshCw, Zap, Crown } from 'lucide-react';
import type { LeaderboardEntry } from '@shared/types';
import { AI_HERO_POSES, resolveRivalSprite } from '@/engine/art/aiAssets';
import { apiClient } from '@/state/apiClient';
import { useGame } from '@/state/GameContext';
import { soundEngine } from '@/engine/audio/soundEffects';

export const LeaderboardView: React.FC = () => {
  const { fighter, startPvpBattle, addToast } = useGame();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [challengingId, setChallengingId] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.getLeaderboard();
      setEntries(res.entries);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur lors du chargement du classement.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  if (!fighter) return null;

  const myEntry = entries.find((e) => e.playerId === fighter.id);

  const handleChallenge = async (entry: LeaderboardEntry) => {
    if (fighter.energy <= 0) {
      addToast('Plus d’énergie pour défier un rival ! Patiente ou monte de niveau.', 'error');
      return;
    }
    setChallengingId(entry.playerId);
    try {
      soundEngine.play('click');
      await startPvpBattle(entry.playerId);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Impossible de lancer le duel PvP.', 'error');
    } finally {
      setChallengingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="view-header">
        <div>
          <h1 className="view-title">
            <Trophy size={26} color="#d97706" />
            Classement Mondial & Duels PvP
          </h1>
          <p className="view-subtitle">
            Défie n’importe quel champion du classement dans un combat PvP asynchrone pour grimper en Elo !
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {myEntry && (
            <span className="badge" style={{ background: '#ffd152', fontSize: '0.86rem', padding: '6px 12px' }}>
              <Crown size={14} />
              Ton Rang : #{myEntry.rank} ({myEntry.rating} Elo)
            </span>
          )}
          <span className="badge" style={{ background: '#ffedd5', fontSize: '0.86rem', padding: '6px 12px' }}>
            <Zap size={14} color="#ea580c" />
            {fighter.energy}/{fighter.maxEnergy}
          </span>
          <button
            type="button"
            className="btn btn--sm"
            disabled={loading}
            onClick={() => {
              soundEngine.play('click');
              void loadLeaderboard();
            }}
          >
            <RefreshCw size={15} />
            Actualiser
          </button>
        </div>
      </div>

      {loading ? (
        <div className="comic-card card-pad" style={{ textAlign: 'center', fontWeight: 800 }}>
          Chargement des champions du classement…
        </div>
      ) : entries.length === 0 ? (
        <div className="comic-card card-pad" style={{ textAlign: 'center', fontWeight: 800 }}>
          Aucun combattant classé pour le moment.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map((entry) => {
            const isMe = entry.playerId === fighter.id;
            const portraitUrl = isMe
              ? AI_HERO_POSES.idle
              : resolveRivalSprite(entry.playerId + ' ' + entry.name).url;
            const medalClass =
              entry.rank === 1
                ? 'rank-medal--1'
                : entry.rank === 2
                  ? 'rank-medal--2'
                  : entry.rank === 3
                    ? 'rank-medal--3'
                    : '';

            return (
              <div
                key={entry.playerId}
                className={`leaderboard-row ${isMe ? 'leaderboard-row--me' : ''}`}
                style={{ flexWrap: 'wrap' }}
              >
                <div className={`rank-medal ${medalClass}`}>
                  {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                </div>

                <img
                  src={portraitUrl}
                  alt={entry.name}
                  className="avatar-thumb"
                  style={{ padding: 2, objectFit: 'contain' }}
                />

                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>
                      {entry.name}
                    </strong>
                    {isMe && (
                      <span className="badge" style={{ background: '#ffd152', fontSize: '0.7rem' }}>
                        TOI
                      </span>
                    )}
                    <span className="badge" style={{ background: '#e0f2fe', fontSize: '0.72rem' }}>
                      Niv.{entry.level}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--ink-muted)' }}>
                    {entry.title} • {entry.wins}V / {entry.losses}D
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: '#fff3d6', fontSize: '0.8rem' }}>
                    🏆 {entry.rating} Elo
                  </span>
                  <span className="badge" style={{ background: '#f5ebd4', fontSize: '0.8rem' }}>
                    ⚔️ {entry.powerScore}
                  </span>

                  {!isMe && (
                    <button
                      type="button"
                      className="btn btn--sm btn--primary"
                      disabled={challengingId !== null || fighter.energy <= 0}
                      onClick={() => void handleChallenge(entry)}
                    >
                      <Swords size={15} />
                      {challengingId === entry.playerId ? 'Duel…' : 'Défier (PvP)'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
