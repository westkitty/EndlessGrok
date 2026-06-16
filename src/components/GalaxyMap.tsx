import { useRef, useEffect, useCallback, useState } from 'react';
import { GALAXY_SIZE_OPTIONS } from '../game/constants';
import { getStarColor } from '../game/galaxy';
import {
  drawJumpLane,
  drawNebulaLayer,
  drawStarGlow,
  drawStarfieldLayer,
  generateNebulaBlobs,
  generateStarfield,
  getNebulaPaletteForRegion,
} from '../assets/galaxy/nebula-procedural';
import { FloatingTooltip } from './Tooltip';
import { SystemTooltipContent } from './SystemTooltip';
import {
  computeGalaxyTransform,
  findSystemAtScreen,
  getFleetDestinationPath,
  getSystemOwner,
  hasColonizedPlanets,
  isSystemContested,
  isSystemSieged,
  SECTOR_NAMES,
  worldToScreen,
  type GalaxyTransform,
  type GalaxyViewport,
} from './galaxy/mapHelpers';
import { getTradePartners } from '../game/diplomacy';
import type { Empire, GameState, StarSystem } from '../game/types';

interface Props {
  state: GameState;
  onSelectSystem: (systemId: string) => void;
  viewport: GalaxyViewport;
  onViewportChange: (viewport: GalaxyViewport) => void;
  onTransformChange?: (transform: GalaxyTransform) => void;
  animationsEnabled?: boolean;
}

function drawLensFlare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  intensity: number,
) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const grad = ctx.createRadialGradient(x, y, 0, x, y, 30 * intensity);
  grad.addColorStop(0, 'rgba(255,255,255,0.5)');
  grad.addColorStop(0.2, color + '88');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, 30 * intensity, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 18 * intensity, y);
  ctx.lineTo(x + 18 * intensity, y);
  ctx.moveTo(x, y - 18 * intensity);
  ctx.lineTo(x, y + 18 * intensity);
  ctx.stroke();
  ctx.restore();
}

function drawBlackHole(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const pulse = 1 + Math.sin(time * 0.003) * 0.05;
  ctx.save();
  const disk = ctx.createRadialGradient(x, y, 8 * pulse, x, y, 22 * pulse);
  disk.addColorStop(0, '#000');
  disk.addColorStop(0.35, '#1a0828');
  disk.addColorStop(0.6, '#9b6dff55');
  disk.addColorStop(0.85, '#d45aff33');
  disk.addColorStop(1, 'transparent');
  ctx.fillStyle = disk;
  ctx.beginPath();
  ctx.arc(x, y, 22 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWormhole(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  const rot = time * 0.002;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 4, i * 1.2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(155, 109, 255, ${0.5 - i * 0.1})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.fillStyle = '#9b6dff';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function getEmpireMapSystem(state: GameState, empire: Empire, viewerId: string): StarSystem | null {
  const viewer = state.empires.find(e => e.id === viewerId);
  if (!viewer) return null;

  const candidates: string[] = [];
  if (empire.capitalSystemId) candidates.push(empire.capitalSystemId);
  for (const system of state.systems) {
    if (system.planets.some(p => p.ownerId === empire.id)) candidates.push(system.id);
    if (empire.knownSystems.has(system.id)) candidates.push(system.id);
  }

  for (const id of candidates) {
    if (!viewer.knownSystems.has(id) && !viewer.visibleSystems.has(id)) continue;
    const system = state.systems.find(s => s.id === id);
    if (system) return system;
  }
  return null;
}

function drawTradeRoute(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  time: number,
  animationsEnabled: boolean,
) {
  ctx.save();
  ctx.setLineDash([6, 8]);
  ctx.lineDashOffset = animationsEnabled ? -time * 0.03 : 0;
  ctx.strokeStyle = 'rgba(255, 200, 80, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.restore();
}

function drawPirateSkull(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.fillStyle = '#ff6b4a';
  ctx.strokeStyle = '#1a0a08';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y - 1, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1a0a08';
  ctx.beginPath();
  ctx.arc(x - 2, y - 2, 1.2, 0, Math.PI * 2);
  ctx.arc(x + 2, y - 2, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 3, y + 1, 6, 2);
  ctx.font = 'bold 7px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('☠', x, y + 1);
  ctx.restore();
}

function drawCrown(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.fillStyle = '#f0c040';
  ctx.strokeStyle = '#ffb84a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 2);
  ctx.lineTo(x - 4, y - 4);
  ctx.lineTo(x - 2, y);
  ctx.lineTo(x, y - 5);
  ctx.lineTo(x + 2, y);
  ctx.lineTo(x + 4, y - 4);
  ctx.lineTo(x + 6, y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function GalaxyMap({
  state,
  onSelectSystem,
  viewport,
  onViewportChange,
  onTransformChange,
  animationsEnabled = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [transform, setTransform] = useState<GalaxyTransform | null>(null);

  const player = state.empires.find(e => e.id === state.playerEmpireId)!;
  const mapSize = GALAXY_SIZE_OPTIONS[state.settings?.galaxySize ?? 'medium'].mapSize;

  const draw = useCallback((time = 0) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    const w = rect.width;
    const h = rect.height;
    const t = computeGalaxyTransform(w, h, mapSize, viewport);
    setTransform(t);
    onTransformChange?.(t);

    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, w, h);

    const stars = generateStarfield(state.seed, w, h, 250);
    drawStarfieldLayer(ctx, stars, time, { x: viewport.panX * 0.02, y: viewport.panY * 0.02 });

    const mid = mapSize / 2;
    const regions = [
      { x: mid * 1.5, y: mid * 0.5, idx: 0 },
      { x: mid * 0.5, y: mid * 0.5, idx: 1 },
      { x: mid * 1.5, y: mid * 1.5, idx: 2 },
      { x: mid * 0.5, y: mid * 1.5, idx: 3 },
    ];
    for (const region of regions) {
      const paletteIdx = regions.indexOf(region);
      const blobs = generateNebulaBlobs(state.seed + paletteIdx, w, h, 2, paletteIdx);
      void getNebulaPaletteForRegion(state.seed, region.x, region.y);
      drawNebulaLayer(ctx, blobs, time);
    }

    ctx.font = '11px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(90, 112, 144, 0.35)';
    const sectorCenters = [
      { label: `${SECTOR_NAMES[0]} Sector`, x: mapSize * 0.75, y: mapSize * 0.25 },
      { label: `${SECTOR_NAMES[1]} Sector`, x: mapSize * 0.25, y: mapSize * 0.25 },
      { label: `${SECTOR_NAMES[2]} Sector`, x: mapSize * 0.75, y: mapSize * 0.75 },
      { label: `${SECTOR_NAMES[3]} Sector`, x: mapSize * 0.25, y: mapSize * 0.75 },
    ];
    for (const sec of sectorCenters) {
      const pos = worldToScreen(sec.x, sec.y, t);
      ctx.fillText(sec.label, pos.x, pos.y);
    }

    const selectedFleet = state.selectedFleetId
      ? state.fleets.find(f => f.id === state.selectedFleetId)
      : null;

    if (selectedFleet && selectedFleet.destinationSystemId) {
      const pathIds = getFleetDestinationPath(state, selectedFleet);
      for (let i = 0; i < pathIds.length - 1; i++) {
        const a = state.systems.find(s => s.id === pathIds[i]);
        const b = state.systems.find(s => s.id === pathIds[i + 1]);
        if (!a || !b) continue;
        const from = worldToScreen(a.x, a.y, t);
        const to = worldToScreen(b.x, b.y, t);
        ctx.save();
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = animationsEnabled ? -time * 0.05 : 0;
        drawJumpLane(ctx, from.x, from.y, to.x, to.y, '#3dd6f5', 0.85, true);
        ctx.restore();
      }
    }

    const playerSystem = getEmpireMapSystem(state, player, player.id);
    const tradePartners = getTradePartners(state, player.id);
    const drawnTradeRoutes = new Set<string>();
    if (playerSystem) {
      const from = worldToScreen(playerSystem.x, playerSystem.y, t);
      for (const partnerId of tradePartners) {
        const partner = state.empires.find(e => e.id === partnerId);
        if (!partner) continue;
        const partnerSystem = getEmpireMapSystem(state, partner, player.id);
        if (!partnerSystem) continue;
        const routeKey = [player.id, partnerId].sort().join('-');
        if (drawnTradeRoutes.has(routeKey)) continue;
        drawnTradeRoutes.add(routeKey);
        const to = worldToScreen(partnerSystem.x, partnerSystem.y, t);
        drawTradeRoute(ctx, from.x, from.y, to.x, to.y, time, animationsEnabled);
      }
    }

    for (const system of state.systems) {
      const from = worldToScreen(system.x, system.y, t);
      for (const connId of system.connections) {
        if (system.id > connId) continue;
        const conn = state.systems.find(s => s.id === connId);
        if (!conn) continue;
        const known = player.knownSystems.has(system.id) && player.knownSystems.has(connId);
        if (!known && !player.visibleSystems.has(system.id) && !player.visibleSystems.has(connId)) continue;
        const to = worldToScreen(conn.x, conn.y, t);
        const glow = player.visibleSystems.has(system.id) && player.visibleSystems.has(connId);
        const ownerA = getSystemOwner(system.id, state);
        const ownerB = getSystemOwner(connId, state);
        const isBorder = ownerA && ownerB && ownerA.id !== ownerB.id;
        const isChokepoint = system.connections.length <= 2 || conn.connections.length <= 2;
        let laneColor = glow ? '#3dd6f5' : '#2a4a7c';
        let laneAlpha = glow ? 0.55 : 0.25;
        if (isBorder && glow) {
          laneColor = '#ff8844';
          laneAlpha = 0.7;
        } else if (isChokepoint && glow) {
          laneColor = '#d45aff';
          laneAlpha = 0.65;
        }
        drawJumpLane(ctx, from.x, from.y, to.x, to.y, laneColor, laneAlpha, glow);
      }
    }

    for (const system of state.systems) {
      const isKnown = player.knownSystems.has(system.id);
      const isVisible = player.visibleSystems.has(system.id);
      if (!isKnown && !isVisible) continue;

      const pos = worldToScreen(system.x, system.y, t);
      const isSelected = state.selectedSystemId === system.id;
      const isHovered = hoveredId === system.id;
      const owner = getSystemOwner(system.id, state);
      const starColor = getStarColor(system.starClass);
      const contested = isSystemContested(system.id, state);
      const sieged = isSystemSieged(system);
      const radius = isSelected ? 10 : isHovered ? 9 : 7;

      if (system.systemType === 'black_hole' && isVisible) {
        drawBlackHole(ctx, pos.x, pos.y, time);
      }

      if (!isVisible) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#333';
        ctx.fill();
        continue;
      }

      if (hasColonizedPlanets(system)) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = owner?.color ? `${owner.color}55` : `${starColor}44`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      const colonizationProject = (state.colonizationProjects ?? []).find(
        p => p.systemId === system.id && p.empireId === player.id
      );
      if (colonizationProject) {
        const progress = 1 - colonizationProject.turnsRemaining / colonizationProject.totalTurns;
        const ringRadius = radius + 12;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, ringRadius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.strokeStyle = 'rgba(74, 255, 106, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(74, 255, 106, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (sieged && animationsEnabled) {
        const pulse = 1 + Math.sin(time * 0.005) * 0.15;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, (radius + 10) * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 90, 106, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (contested && animationsEnabled) {
        const pulse = 1 + Math.sin(time * 0.004) * 0.1;
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, (radius + 8) * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 184, 74, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      if (isSelected || isHovered) {
        drawLensFlare(ctx, pos.x, pos.y, starColor, isSelected ? 1.2 : 0.8);
      }

      const ownerColor = owner?.color;
      if (ownerColor) {
        drawStarGlow(ctx, pos.x, pos.y, radius, ownerColor, isSelected ? 1.2 : 0.9);
      } else if (system.systemType !== 'black_hole') {
        drawStarGlow(ctx, pos.x, pos.y, radius, starColor, 0.8);
      }

      if (isSelected) {
        ctx.strokeStyle = '#4a9eff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (system.anomaly?.type === 'wormhole' && !system.exploredBy[player.id]) {
        drawWormhole(ctx, pos.x + radius + 6, pos.y - radius - 4, time);
      } else if (system.anomaly && !system.exploredBy[player.id]) {
        ctx.beginPath();
        ctx.arc(pos.x + radius, pos.y - radius, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffaa00';
        ctx.fill();
      }

      const isCapital = state.empires.some(e => e.capitalSystemId === system.id);
      if (isCapital) {
        drawCrown(ctx, pos.x, pos.y - radius - 12);
      }

      ctx.fillStyle = isVisible ? '#ccc' : '#666';
      ctx.font = '10px Exo 2, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(system.name, pos.x, pos.y + radius + 14);

      const fleetsHere = state.fleets.filter(f => f.systemId === system.id);
      fleetsHere.forEach((fleet, i) => {
        const empire = state.empires.find(e => e.id === fleet.empireId);
        const fx = pos.x + (i - (fleetsHere.length - 1) / 2) * 12;
        const fy = pos.y - radius - 8;
        if (empire?.isPirate || fleet.empireId === state.pirateEmpireId) {
          drawPirateSkull(ctx, fx, fy);
          return;
        }
        ctx.beginPath();
        ctx.moveTo(fx, fy - 5);
        ctx.lineTo(fx - 4, fy + 3);
        ctx.lineTo(fx + 4, fy + 3);
        ctx.closePath();
        ctx.fillStyle = empire?.color || '#fff';
        ctx.fill();
      });
    }
  }, [state, player, mapSize, viewport, hoveredId, onTransformChange, animationsEnabled]);

  useEffect(() => {
    if (!animationsEnabled) {
      draw(0);
      return;
    }
    const loop = (time: number) => {
      draw(time);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw, animationsEnabled]);

  useEffect(() => {
    const handleResize = () => draw(0);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, viewport.zoom * delta));
    onViewportChange({ ...viewport, zoom: newZoom });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { x: e.clientX, y: e.clientY, panX: viewport.panX, panY: viewport.panY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !transform) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      onViewportChange({
        ...viewport,
        panX: dragRef.current.panX + dx,
        panY: dragRef.current.panY + dy,
      });
      return;
    }

    const closest = findSystemAtScreen(mx, my, state, player.id, transform);
    setHoveredId(closest);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => { dragRef.current = null; };

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !transform) return;
    const rect = canvas.getBoundingClientRect();
    const closest = findSystemAtScreen(e.clientX - rect.left, e.clientY - rect.top, state, player.id, transform);
    if (closest) onSelectSystem(closest);
  };

  const resetZoom = () => onViewportChange({ zoom: 1, panX: 0, panY: 0 });

  const hoveredSystem: StarSystem | null = hoveredId
    ? state.systems.find(s => s.id === hoveredId) ?? null
    : null;

  return (
    <div className="galaxy-map-wrapper">
      <canvas
        ref={canvasRef}
        className="galaxy-canvas"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { dragRef.current = null; setHoveredId(null); }}
        onClick={handleClick}
        style={{ width: '100%', height: '100%' }}
      />
      <button className="btn btn-sm galaxy-reset-btn" onClick={resetZoom} title="Reset zoom (R)">
        Reset View
      </button>
      {hoveredSystem && (
        <FloatingTooltip
          x={tooltipPos.x}
          y={tooltipPos.y}
          visible
          content={<SystemTooltipContent system={hoveredSystem} state={state} playerId={player.id} />}
        />
      )}
    </div>
  );
}

export function getDefaultViewport(): GalaxyViewport {
  return { zoom: 1, panX: 0, panY: 0 };
}