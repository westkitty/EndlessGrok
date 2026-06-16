import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createNewGame } from '../../../game/game';
import { FleetPanel } from '../../../components/FleetPanel';
import { AssetIcon } from '../../../components/AssetIcon';
import { getAssetTestId } from '../resolve';

describe('registry-backed panel icons', () => {
  it('AssetIcon renders stable testId for fleet manager', () => {
    const html = renderToStaticMarkup(<AssetIcon mechanicalKey="fleet:manager" size={14} />);
    expect(html).toContain(getAssetTestId('fleet:manager'));
  });

  it('AssetIcon fallback for unknown key does not throw', () => {
    const html = renderToStaticMarkup(<AssetIcon mechanicalKey="fleet:nonexistent-role" size={12} />);
    expect(html).toContain('data-testid');
  });

  it('FleetPanel renders fleet manager with registry icon', () => {
    const state = createNewGame(601, { empireCount: 2 });
    const html = renderToStaticMarkup(
      <FleetPanel state={state} onUpdate={() => {}} />,
    );
    expect(html).toContain('data-testid="fleet-manager"');
    expect(html).toContain('data-asset-key="fleet:manager"');
    if (state.fleets.length > 0) {
      expect(html).toContain('fleet-role-');
    }
  });
});