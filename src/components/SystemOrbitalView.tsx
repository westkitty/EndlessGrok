import { useRef, useEffect } from 'react';
import { getStarColor } from '../game/galaxy';
import type { StarSystem } from '../game/types';

interface Props {
  system: StarSystem;
  ownerColor?: string;
}

export function SystemOrbitalView({ system, ownerColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const starColor = getStarColor(system.starClass);
      const time = Date.now() * 0.001;

      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
      bg.addColorStop(0, 'rgba(10, 14, 24, 0.9)');
      bg.addColorStop(1, 'rgba(4, 6, 12, 0.4)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const planetCount = system.planets.length;
      for (let i = 0; i < planetCount; i++) {
        const orbitR = 28 + i * 18;
        ctx.beginPath();
        ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(120, 170, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        const angle = time * (0.3 + i * 0.1) + (i * Math.PI * 2) / Math.max(planetCount, 1);
        const px = cx + Math.cos(angle) * orbitR;
        const py = cy + Math.sin(angle) * orbitR;
        const planet = system.planets[i];
        const isOwned = !!planet.ownerId;
        const radius = 3 + (planet.isColonized ? 2 : 0);

        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = isOwned ? (ownerColor ?? '#4a9eff') : '#5a7090';
        ctx.fill();
      }

      const starGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
      starGlow.addColorStop(0, starColor);
      starGlow.addColorStop(0.5, `${starColor}66`);
      starGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = starGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = starColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [system, ownerColor]);

  return (
    <canvas
      ref={canvasRef}
      className="orbital-view"
      width={200}
      height={80}
      aria-label={`Orbital view of ${system.name}`}
    />
  );
}