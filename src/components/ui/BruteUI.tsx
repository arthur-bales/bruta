// ============================================================================
// BRUTE LEGENDS — "Arène Parchemin" reusable UI building blocks
// (segmented stat bars, heart HP, plaques, parchment buttons, wood board…)
// ============================================================================

import React from 'react';

/** Format large numbers compactly (12 345 -> 12.3k). */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.floor(n).toLocaleString('fr-FR');
}

// ---------------------------------------------------------------------------
// Segmented stat bar: 10 olive/yellow cells like the original My Brute page
// ---------------------------------------------------------------------------
interface SegmentedBarProps {
  /** Current value of the stat. */
  value: number;
  /** Value that fills every cell. Defaults to `cells` (1 point = 1 cell). */
  max?: number;
  /** Optional extra value (e.g. equipment bonus) drawn in orange after the base cells. */
  bonus?: number;
  cells?: number;
  size?: 'md' | 'sm';
  title?: string;
}

export const SegmentedBar: React.FC<SegmentedBarProps> = ({
  value,
  max,
  bonus = 0,
  cells = 10,
  size = 'md',
  title,
}) => {
  const scale = Math.max(1, max ?? cells);
  const baseOn = Math.max(0, Math.min(cells, Math.round((value / scale) * cells)));
  const bonusOn = Math.max(0, Math.min(cells - baseOn, Math.round((bonus / scale) * cells)));
  return (
    <div
      className={`seg-bar ${size === 'sm' ? 'seg-bar--sm' : ''}`}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={scale}
      title={title}
    >
      {Array.from({ length: cells }, (_, i) => (
        <span
          key={i}
          className={`seg-bar__cell ${
            i < baseOn ? 'seg-bar__cell--on' : i < baseOn + bonusOn ? 'seg-bar__cell--bonus' : ''
          }`}
        />
      ))}
    </div>
  );
};

interface SegmentedStatProps extends SegmentedBarProps {
  label: string;
  /** Text displayed at the end of the row (defaults to the value). */
  display?: React.ReactNode;
  stacked?: boolean;
}

export const SegmentedStat: React.FC<SegmentedStatProps> = ({
  label,
  display,
  stacked = false,
  ...bar
}) => (
  <div className={`seg-stat ${stacked ? 'seg-stat--stacked' : ''}`}>
    <span className="seg-stat__label">{label}{stacked ? '' : ' :'}</span>
    <SegmentedBar {...bar} title={`${label} : ${bar.value}`} />
    {!stacked && <span className="seg-stat__value">{display ?? Math.round(bar.value)}</span>}
  </div>
);

// ---------------------------------------------------------------------------
// Heart HP badge
// ---------------------------------------------------------------------------
export const HeartHp: React.FC<{ hp: number; label?: string; hideLabel?: boolean }> = ({
  hp,
  label = 'points de vie',
  hideLabel = false,
}) => (
  <div className="heart-hp">
    <div className="heart-hp__heart" aria-label={`${hp} ${label}`}>
      <span>{formatCompact(hp)}</span>
    </div>
    {!hideLabel && <span className="heart-hp__label">{label}</span>}
  </div>
);

// ---------------------------------------------------------------------------
// Resource pill (gold / gems / energy)
// ---------------------------------------------------------------------------
export const CoinPill: React.FC<{
  value: React.ReactNode;
  kind?: 'gold' | 'gem' | 'energy';
  title?: string;
  className?: string;
}> = ({ value, kind = 'gold', title, className = '' }) => (
  <span className={`coin-pill ${className}`} title={title}>
    <span
      className={`coin-pill__icon ${kind === 'gem' ? 'coin-pill__icon--gem' : ''} ${
        kind === 'energy' ? 'coin-pill__icon--energy' : ''
      }`}
      aria-hidden="true"
    />
    {value}
  </span>
);

// ---------------------------------------------------------------------------
// Section panel with an uppercase chunky title
// ---------------------------------------------------------------------------
export const SectionCard: React.FC<{
  title?: React.ReactNode;
  right?: React.ReactNode;
  variant?: 'default' | 'dark' | 'sunk' | 'wood';
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ title, right, variant = 'default', className = '', style, children }) => (
  <section
    className={`mb-panel ${variant !== 'default' ? `mb-panel--${variant}` : ''} mb-section ${className}`}
    style={style}
  >
    {(title || right) && (
      <header className="mb-section__head">
        {title && <h2 className="mb-section-title">{title}</h2>}
        {right && <div className="mb-section__right">{right}</div>}
      </header>
    )}
    {children}
  </section>
);

// ---------------------------------------------------------------------------
// Price button ("15 🪙")
// ---------------------------------------------------------------------------
export const PriceButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { cost: number | string; currency?: 'gold' | 'gem' }
> = ({ cost, currency = 'gold', className = '', ...rest }) => (
  <button type="button" className={`price-btn ${className}`} {...rest}>
    <span>{typeof cost === 'number' ? formatCompact(cost) : cost}</span>
    <span
      className={`coin-pill__icon ${currency === 'gem' ? 'coin-pill__icon--gem' : ''}`}
      style={{ width: 18, height: 18 }}
      aria-hidden="true"
    />
  </button>
);

// ---------------------------------------------------------------------------
// Torn parchment button (the big "ARENA" button)
// ---------------------------------------------------------------------------
export const ParchmentButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className = '',
  children,
  ...rest
}) => (
  <button type="button" className={`parchment-btn ${className}`} {...rest}>
    {children}
  </button>
);

// ---------------------------------------------------------------------------
// List row (training upgrades, opponents, shop items…)
// ---------------------------------------------------------------------------
export const MbRow: React.FC<{
  icon?: React.ReactNode;
  title: React.ReactNode;
  level?: React.ReactNode;
  desc?: React.ReactNode;
  right?: React.ReactNode;
  state?: 'default' | 'active' | 'locked';
  onClick?: () => void;
  className?: string;
}> = ({ icon, title, level, desc, right, state = 'default', onClick, className = '' }) => (
  <div
    className={`mb-row ${state !== 'default' ? `mb-row--${state}` : ''} ${className}`}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={
      onClick
        ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }
        : undefined
    }
    style={onClick ? { cursor: 'pointer' } : undefined}
  >
    {icon !== undefined && <div className="mb-row__icon">{icon}</div>}
    <div className="mb-row__body">
      <div className="mb-row__title">
        {title}
        {level !== undefined && <em>{level}</em>}
      </div>
      {desc && <div className="mb-row__desc">{desc}</div>}
    </div>
    {right}
  </div>
);
