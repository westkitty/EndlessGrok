import { useEffect, useState } from 'react';
import { Icon } from './icons/Icon';

interface Props {
  active: boolean;
  animationsEnabled?: boolean;
}

export function CombatOverlay({ active, animationsEnabled = true }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active || !animationsEnabled) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 600);
    return () => clearTimeout(timer);
  }, [active, animationsEnabled]);

  if (!visible) return null;

  return (
    <div className="combat-overlay" aria-hidden="true">
      <div className="combat-overlay__flash" />
      <div className="combat-overlay__icon">
        <Icon name="combat" size={48} />
      </div>
    </div>
  );
}