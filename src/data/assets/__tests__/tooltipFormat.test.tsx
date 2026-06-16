import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { formatAssetTooltip, formatCanonLabel, tooltipSectionsToPlainText } from '../tooltipFormat';
import { StarsilkTooltipContent } from '../../../components/StarsilkTooltip';

describe('tooltip formatting', () => {
  it('formats mechanical and lore sections', () => {
    const sections = formatAssetTooltip({
      title: 'Starsilk Thread',
      mechanical: 'Macro fuel.',
      lore: 'Dangerous filament.',
      warning: 'Not fuel.',
      costs: ['2 Syrin Reagent'],
      effects: ['5 turns'],
      requirements: ['Macro Execution'],
      canonLabel: 'direct_canon',
      value: 3,
    });
    expect(sections.mechanical).toContain('Macro fuel');
    expect(sections.lore).toContain('filament');
    expect(sections.warning).toBe('Not fuel.');
    expect(sections.costs).toContain('Syrin');
    expect(sections.canonLabel).toBe('Direct canon');
    expect(sections.runtimeLines[0]).toContain('Current: 3');
  });

  it('handles missing optional fields', () => {
    const sections = formatAssetTooltip({
      title: 'Test',
      mechanical: 'Mechanics',
      lore: 'Lore',
    });
    expect(sections.warning).toBeUndefined();
    expect(sections.costs).toBeUndefined();
    const text = tooltipSectionsToPlainText(sections);
    expect(text).toContain('Mechanics');
    expect(text).toContain('Lore');
  });

  it('renders StarsilkTooltipContent with test ids', () => {
    const html = renderToStaticMarkup(
      <StarsilkTooltipContent
        data={{
          title: 'The Starbinding',
          mechanical: 'Catastrophic victory.',
          lore: 'Sky severed.',
          warning: 'Irreversible.',
        }}
        testId="tooltip-victory-starbinding"
      />,
    );
    expect(html).toContain('data-testid="tooltip-victory-starbinding-mechanical"');
    expect(html).toContain('Catastrophic victory');
    expect(html).toContain('Irreversible');
    expect(html).toContain('Sky severed');
  });

  it('formatCanonLabel covers adaptation labels', () => {
    expect(formatCanonLabel('interpretive')).toBe('Interpretive adaptation');
    expect(formatCanonLabel(undefined)).toBeNull();
  });
});