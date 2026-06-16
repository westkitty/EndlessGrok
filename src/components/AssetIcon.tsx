import { Icon } from './icons/Icon';
import {
  getAssetAccessibilityLabel,
  getAssetIconName,
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
  const iconName = getAssetIconName(mechanicalKey);
  const variant = getAssetVisualVariant(mechanicalKey);
  const testId = getAssetTestId(mechanicalKey);
  const aria = title ?? getAssetAccessibilityLabel(mechanicalKey);

  return (
    <span
      className={`asset-icon asset-icon--${variant} ${className}`.trim()}
      data-testid={testId}
      data-asset-key={mechanicalKey}
      aria-label={aria}
    >
      <Icon name={iconName} size={size} title={aria} />
    </span>
  );
}