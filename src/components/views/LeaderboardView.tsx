import React, { useCallback, useEffect, useState } from 'react';
import { Swords, RefreshCw, Crown } from 'lucide-react';
import type { LeaderboardEntry } from '@shared/types';
import { AI_HERO_POSES, resolveRivalSprite } from '@/engine/art/aiAssets';
import { CoinPill, HeartHp, SectionCard } from '@/components/ui/BruteUI';
import { GameIcon } from '@/components/ui/GameIcon';
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
      addToast(
        err instanceof Error ? err.message : 'Erreur lors du chargement du classement.',
        'error',
      );
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
    <div className="lb-view">
      <SectionCard
        title="CLASSEMENT DE L'ARÈNE"
        right={
          <div className="arena-opps-right">
            {myEntry && (
              <span className="mb-tag mb-tag--orange" title="Ton classement actuel">
                <Crown size={13} style={{ marginRight: 4 }} />#{myEntry.rank} • {myEntry.rating} Elo
              </span>
            )}
            <CoinPill
              kind="energy"
              value={`${fighter.energy}/${fighter.maxEnergy}`}
              title="Énergie d'arène"
              className="arena-energy-pill"
            />
            <button
              type="button"
              className="btn btn--sm"
              disabled={loading}
              onClick={() => {
                soundEngine.play('click');
                void loadLeaderboard();
              }}
            >
              <RefreshCw size={14} />
              Actualiser
            </button>
          </div>
        }
      >
        <p className="mb-flavor" style={{ margin: '0 0 12px' }}>
          Défie les champions du classement en duel PvP pour grimper dans l’arène !
        </p>

        {loading ? (
          <div className="lb-empty">Chargement des champions du classement…</div>
        ) : entries.length === 0 ? (
          <div className="lb-empty">Aucun combattant classé pour le moment.</div>
        ) : (
          <div className="lb-list">
            {entries.map((entry) => {
              const isMe = entry.playerId === fighter.id;
              const portraitUrl = isMe
                ? AI_HERO_POSES.idle
                : resolveRivalSprite(`${entry.playerId} ${entry.name}`).url;

              const rankTierClass =
                entry.rank === 1
                  ? 'lb-rank--1'
                  : entry.rank === 2
                    ? 'lb-rank--2'
                    : entry.rank === 3
                      ? 'lb-rank--3'
                      : '';
              const rowTopClass =
                entry.rank === 1
                  ? 'lb-row--top1'
                  : entry.rank === 2
                    ? 'lb-row--top2'
                    : entry.rank === 3
                      ? 'lb-row--top3'
                      : '';

              return (
                <div
                  key={entry.playerId}
                  className={`lb-row ${rowTopClass} ${isMe ? 'lb-row--me' : ''}`}
                >
                  <div className={`lb-rank ${rankTierClass}`} aria-label={`Rang ${entry.rank}`}>
                    #{entry.rank}
                  </div>

                  <img src={portraitUrl} alt={entry.name} className="lb-avatar" />

                  <div className="lb-info">
                    <div className="lb-name-row">
                      <strong className="lb-name">{entry.name}</strong>
                      <span className="mb-tag">NIV. {entry.level}</span>
                      {isMe && <span className="mb-tag mb-tag--orange">TOI</span>}
                    </div>
                    <div className="lb-sub">
                      {entry.title} • {entry.wins}V / {entry.losses}D
                    </div>
                  </div>

                  <div className="lb-stats">
                    <div title={`Puissance : ${entry.powerScore}`}>
                      <HeartHp hp={entry.powerScore} label="puissance" hideLabel />
                    </div>
                    <span className="lb-elo-pill">
                      <GameIcon name="crown" size={16} />
                      {entry.rating} Elo
                    </span>

                    {!isMe && (
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        disabled={challengingId !== null || fighter.energy <= 0}
                        onClick={() => void handleChallenge(entry)}
                      >
                        <Swords size={15} />
                        {challengingId === entry.playerId ? 'DUEL…' : 'DÉFIER'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
};
