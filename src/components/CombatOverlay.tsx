import { useEffect, useState } from 'react';
import { Icon } from './icons/Icon';

interface Props {
  active: boolean;
  animationsEnabled?: boolean;
}

export function CombatOverlay({ active, animationsEnabled = true }: Props) {
  const [animating, setAnimating] = useState(false);
  const enabled = active && animationsEnabled;

  useEffect(() => {
    if (!enabled) return;
    const frame = requestAnimationFrame(() => setAnimating(true));
    const timer = setTimeout(() => setAnimating(false), 600);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [enabled, active]);

  if (!enabled || !animating) return null;

  return (
    <div className="combat-overlay" aria-hidden="true">
      <div className="combat-overlay__flash" />
      <div className="combat-overlay__icon">
        <Icon name="combat" size={48} />
      </div>
    </div>
  );
}