import type { AssetTooltipSpec, RuntimeTooltipContext } from '../data/assets/types';
import { formatAssetTooltip } from '../data/assets/tooltipFormat';

interface Props {
  data: AssetTooltipSpec & RuntimeTooltipContext;
  testId?: string;
  compact?: boolean;
}

export function StarsilkTooltipContent({ data, testId, compact = false }: Props) {
  const sections = formatAssetTooltip(data);
  const id = testId ?? 'starsilk-tooltip';

  return (
    <div className={`starsilk-tooltip ${compact ? 'starsilk-tooltip--compact' : ''}`} data-testid={id}>
      <div className="starsilk-tooltip__title" data-testid={`${id}-title`}>{sections.title}</div>

      <div className="starsilk-tooltip__mechanical" data-testid={`${id}-mechanical`}>
        {sections.mechanical}
      </div>

      {sections.runtimeLines.map((line, i) => (
        <div key={i} className="starsilk-tooltip__runtime" data-testid={`${id}-runtime-${i}`}>
          {line}
        </div>
      ))}

      {sections.costs && (
        <div className="starsilk-tooltip__costs" data-testid={`${id}-costs`}>
          <span className="starsilk-tooltip__label">Costs</span> {sections.costs}
        </div>
      )}

      {sections.effects && (
        <div className="starsilk-tooltip__effects" data-testid={`${id}-effects`}>
          <span className="starsilk-tooltip__label">Effects</span> {sections.effects}
        </div>
      )}

      {sections.requirements && (
        <div className="starsilk-tooltip__requirements" data-testid={`${id}-requirements`}>
          <span className="starsilk-tooltip__label">Requires</span> {sections.requirements}
        </div>
      )}

      {sections.stateLabel && (
        <div className="starsilk-tooltip__state" data-testid={`${id}-state`}>
          <span className="starsilk-tooltip__label">Status</span> {sections.stateLabel}
        </div>
      )}

      {sections.warning && (
        <div className="starsilk-tooltip__warning" data-testid={`${id}-warning`}>
          {sections.warning}
        </div>
      )}

      <div className="starsilk-tooltip__lore" data-testid={`${id}-lore`}>
        {sections.lore}
      </div>

      {sections.canonLabel && (
        <div className="starsilk-tooltip__canon" data-testid={`${id}-canon`}>
          {sections.canonLabel}
        </div>
      )}
    </div>
  );
}