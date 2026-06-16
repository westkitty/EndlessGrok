import { useRef, useEffect, useCallback } from 'react';
import { GALAXY_SIZE_OPTIONS } from '../game/constants';
import { getStarColor } from '../game/galaxy';
import type { GameState } from '../game/types';
import {
  computeGalaxyTransform,
  getSystemOwner,
  type GalaxyTransform,
  type GalaxyViewport,
  worldToScreen,
} from './galaxy/mapHelpers';

interface Props {
  state: GameState;
  viewport: GalaxyViewport;
  transform: GalaxyTransform;
  onNavigate: (panX: number, panY: number) => void;
  onSelectSystem: (systemId: string) => void;
}

const MINIMAP_W = 168;
const MINIMAP_H = 120;

export function Minimap({ state, viewport, transform, onNavigate, onSelectSystem }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const player = state.empires.find(e => e.id === state.playerEmpireId)!;
  const mapSize = GALAXY_SIZE_OPTIONS[state.settings?.galaxySize ?? 'medium'].mapSize;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const miniScale = Math.min(MINIMAP_W, MINIMAP_H) / (mapSize + 20);
    const offsetX = (MINIMAP_W - mapSize * miniScale) / 2;
    const offsetY = (MINIMAP_H - mapSize * miniScale) / 2;

    ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H);
    ctx.fillStyle = 'rgba(4, 6, 12, 0.85)';
    ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H);
    ctx.strokeStyle = 'rgba(120, 170, 255, 0.25)';
    ctx.strokeRect(0.5, 0.5, MINIMAP_W - 1, MINIMAP_H - 1);

    const toMini = (x: number, y: number) => ({
      x: offsetX + x * miniScale,
      y: offsetY + y * miniScale,
    });

    for (const system of state.systems) {
      if (!player.knownSystems.has(system.id) && !player.visibleSystems.has(system.id)) continue;
      const pos = toMini(system.x, system.y);
      const owner = getSystemOwner(system.id, state);
      const isVisible = player.visibleSystems.has(system.id);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, state.selectedSystemId === system.id ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = owner?.color ?? (isVisible ? getStarColor(system.starClass) : '#444');
      ctx.fill();
    }

    const visW = transform.width / viewport.zoom;
    const visH = transform.height / viewport.zoom;
    const worldCenter = {
      x: (transform.width / 2 - transform.offsetX) / transform.scale,
      y: (transform.height / 2 - transform.offsetY) / transform.scale,
    };
    const rectWorld = {
      x: worldCenter.x - visW / 2 / transform.scale * (transform.scale / miniScale) * miniScale / transform.scale,
      y: worldCenter.y - visH / 2 / transform.scale * (transform.scale / miniScale) * miniScale / transform.scale,
      w: visW / transform.scale * miniScale,
      h: visH / transform.scale * miniScale,
    };

    const topLeftWorld = {
      x: -viewport.panX / transform.scale + (transform.width / 2 - mapSize * transform.scale / 2) / transform.scale,
      y: -viewport.panY / transform.scale + (transform.height / 2 - mapSize * transform.scale / 2) / transform.scale,
    };

    const vr = {
      x: offsetX + Math.max(0, (-viewport.panX) / transform.scale + (transform.width - mapSize * transform.scale) / 2 / transform.scale) * miniScale,
      y: offsetY + Math.max(0, (-viewport.panY) / transform.scale + (transform.height - mapSize * transform.scale) / 2 / transform.scale) * miniScale,
      w: Math.min(MINIMAP_W, (transform.width / viewport.zoom / transform.scale) * miniScale),
      h: Math.min(MINIMAP_H, (transform.height / viewport.zoom / transform.scale) * miniScale),
    };

    void rectWorld;
    void topLeftWorld;

    const centerScreen = worldToScreen(mapSize / 2, mapSize / 2, transform);
    const viewW = (transform.width / viewport.zoom);
    const viewH = (transform.height / viewport.zoom);
    const viewRect = {
      x: offsetX + (centerScreen.x - viewW / 2 - transform.offsetX + (transform.width - mapSize * transform.scale) / 2) / transform.scale * miniScale,
      y: offsetY + (centerScreen.y - viewH / 2 - transform.offsetY + (transform.height - mapSize * transform.scale) / 2) / transform.scale * miniScale,
      w: (viewW / transform.scale) * miniScale,
      h: (viewH / transform.scale) * miniScale,
    };

    ctx.strokeStyle = 'rgba(61, 214, 245, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      Math.max(offsetX, Math.min(offsetX + mapSize * miniScale - viewRect.w, viewRect.x)),
      Math.max(offsetY, Math.min(offsetY + mapSize * miniScale - viewRect.h, viewRect.y)),
      Math.min(viewRect.w, mapSize * miniScale),
      Math.min(viewRect.h, mapSize * miniScale),
    );

    void vr;
  }, [state, player, mapSize, viewport, transform]);

  useEffect(() => { draw(); }, [draw]);

  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const miniScale = Math.min(MINIMAP_W, MINIMAP_H) / (mapSize + 20);
    const offsetX = (MINIMAP_W - mapSize * miniScale) / 2;
    const offsetY = (MINIMAP_H - mapSize * miniScale) / 2;

    const wx = (mx - offsetX) / miniScale;
    const wy = (my - offsetY) / miniScale;

    let closest: string | null = null;
    let closestDist = 30;
    for (const system of state.systems) {
      if (!player.knownSystems.has(system.id) && !player.visibleSystems.has(system.id)) continue;
      const dist = Math.sqrt((wx - system.x) ** 2 + (wy - system.y) ** 2);
      if (dist < closestDist) {
        closestDist = dist;
        closest = system.id;
      }
    }

    if (closest) {
      onSelectSystem(closest);
      const sys = state.systems.find(s => s.id === closest)!;
      const fullTransform = computeGalaxyTransform(transform.width, transform.height, mapSize, { zoom: viewport.zoom, panX: 0, panY: 0 });
      const target = worldToScreen(sys.x, sys.y, fullTransform);
      onNavigate(
        transform.width / 2 - target.x,
        transform.height / 2 - target.y,
      );
      return;
    }

    const fullScale = Math.min(transform.width, transform.height) / (mapSize + 40) * viewport.zoom;
    const panX = transform.width / 2 - wx * fullScale - (transform.width - mapSize * fullScale) / 2;
    const panY = transform.height / 2 - wy * fullScale - (transform.height - mapSize * fullScale) / 2;
    onNavigate(panX, panY);
  };

  return (
    <div className="minimap" title="Click to navigate">
      <div className="minimap__label">Galaxy</div>
      <canvas
        ref={canvasRef}
        width={MINIMAP_W}
        height={MINIMAP_H}
        className="minimap__canvas"
        onClick={handleClick}
      />
    </div>
  );
}