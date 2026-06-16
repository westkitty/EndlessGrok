import { useState, useRef, type ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  delay?: number;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  className = '',
  delay = 200,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <span
      className={`tooltip-wrapper ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && content && (
        <span className={`tooltip tooltip-${position}`} role="tooltip">
          {content}
        </span>
      )}
    </span>
  );
}

interface FloatingTooltipProps {
  x: number;
  y: number;
  content: ReactNode;
  visible: boolean;
}

export function FloatingTooltip({ x, y, content, visible }: FloatingTooltipProps) {
  if (!visible || !content) return null;

  return (
    <div
      className="floating-tooltip"
      style={{ left: x, top: y }}
      role="tooltip"
    >
      {content}
    </div>
  );
}