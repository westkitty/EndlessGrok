import { ICONS, type IconName } from './iconHelpers';

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 20, className = '', title, style }: IconProps) {
  const src = ICONS[name];
  return (
    <img
      src={src}
      alt={title ?? name}
      title={title}
      className={`icon ${className}`}
      width={size}
      height={size}
      draggable={false}
      style={style}
    />
  );
}