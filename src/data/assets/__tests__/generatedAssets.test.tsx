import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssetIcon } from '../../../components/AssetIcon';
import {
  getAssetSvgUrl,
  getAssetIconSrc,
  hasGeneratedAssetRecord,
} from '../resolve';
import { getAssetByMechanicalKey } from '../registry';
import { publicAssetPathToUrl } from '../paths';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

const GENERATED_SAMPLES = [
  { key: 'resource:starsilkThread', file: 'public/assets/icons/resources/resource-starsilk-thread.svg' },
  { key: 'victory:starbinding', file: 'public/assets/icons/victory/victory-starbinding.svg' },
  { key: 'macro:local_checksum_audit', file: 'public/assets/icons/macros/macro-local-checksum-audit.svg' },
] as const;

describe('generated Starsilk asset batch', () => {
  for (const sample of GENERATED_SAMPLES) {
    it(`SVG file exists for ${sample.key}`, () => {
      expect(existsSync(resolve(repoRoot, sample.file))).toBe(true);
    });

    it(`resolves public URL for ${sample.key}`, () => {
      const record = getAssetByMechanicalKey(sample.key);
      expect(record).toBeDefined();
      expect(record?.status).toBe('generated');
      expect(hasGeneratedAssetRecord(record!)).toBe(true);
      const url = getAssetSvgUrl(sample.key);
      expect(url).toBe(publicAssetPathToUrl(sample.file));
      expect(getAssetIconSrc(sample.key)).toBe(url);
    });
  }

  it('AssetIcon renders generated SVG with data-asset-svg', () => {
    const html = renderToStaticMarkup(<AssetIcon mechanicalKey="resource:starsilkThread" />);
    expect(html).toContain('data-asset-svg="/assets/icons/resources/resource-starsilk-thread.svg"');
    expect(html).toContain('src="/assets/icons/resources/resource-starsilk-thread.svg"');
  });

  it('planned assets without generated status keep fallback icon', () => {
    const record = getAssetByMechanicalKey('macro-effect:hazardSuppressed');
    expect(record?.status).toBe('planned');
    expect(getAssetSvgUrl('macro-effect:hazardSuppressed')).toBeNull();
  });
});