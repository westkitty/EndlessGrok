import { Icon } from './icons/Icon';
import {
  getAssetAccessibilityLabel,
  getAssetIconName,
  getAssetIconSrc,
  getAssetSvgUrl,
  getAssetTestId,
  getAssetVisualVariant,
} from '../data/assets/resolve';

interface Props {
  mechanicalKey: string;
  size?: number;
  className?: string;
  title?: string;
}

export function AssetIcon({ mechanicalKey, size = 20, className = '', title }: Props) {
  const svgUrl = getAssetSvgUrl(mechanicalKey);
  const iconSrc = getAssetIconSrc(mechanicalKey);
  const variant = getAssetVisualVariant(mechanicalKey);
  const testId = getAssetTestId(mechanicalKey);
  const aria = title ?? getAssetAccessibilityLabel(mechanicalKey);

  return (
    <span
      className={`asset-icon asset-icon--${variant} ${className}`.trim()}
      data-testid={testId}
      data-asset-key={mechanicalKey}
      data-asset-svg={svgUrl ?? undefined}
      aria-label={aria}
    >
      {svgUrl ? (
        <img
          src={iconSrc}
          alt={aria}
          title={aria}
          className="icon"
          width={size}
          height={size}
          draggable={false}
        />
      ) : (
        <Icon name={getAssetIconName(mechanicalKey)} size={size} title={aria} />
      )}
    </span>
  );
}