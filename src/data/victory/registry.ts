import { getAssetById } from '../assets/runtimeManifest';
import { STARSILK_VICTORY_PATHS } from './records';
import type { VictoryPathId, VictoryPathRecord } from './types';

const byId = new Map<VictoryPathId, VictoryPathRecord>(
  STARSILK_VICTORY_PATHS.map(path => [path.id, path]),
);

export interface VictoryValidationError {
  pathId: string;
  message: string;
}

export function getVictoryPath(id: VictoryPathId): VictoryPathRecord | undefined {
  return byId.get(id);
}

export function getAllVictoryPaths(): VictoryPathRecord[] {
  return [...STARSILK_VICTORY_PATHS];
}

export function getIrreversibleStages(): VictoryPathRecord['stages'] {
  return STARSILK_VICTORY_PATHS.flatMap(path => path.stages.filter(stage => stage.irreversible));
}

export function validateVictoryPaths(): VictoryValidationError[] {
  const errors: VictoryValidationError[] = [];

  for (const path of STARSILK_VICTORY_PATHS) {
    if (!getAssetById(path.assetId)) {
      errors.push({ pathId: path.id, message: `Primary asset missing: ${path.assetId}` });
    }

    for (const stage of path.stages) {
      if (!getAssetById(stage.assetId)) {
        errors.push({ pathId: path.id, message: `Stage asset missing: ${stage.assetId}` });
      }
      if (stage.irreversible && !stage.warning) {
        errors.push({ pathId: path.id, message: `Irreversible stage ${stage.id} requires warning text` });
      }
    }

    if (path.id === 'starbinding' && !path.warning.includes('Irreversible')) {
      errors.push({ pathId: path.id, message: 'Starbinding path must declare irreversibility in warning' });
    }
  }

  return errors;
}