import { useRef, useEffect } from 'react';
import { drawNebulaLayer, drawStarfieldLayer, generateNebulaBlobs, generateStarfield } from '../assets/galaxy/nebula-procedural';

interface StarfieldBackgroundProps {
  seed?: number;
  className?: string;
}

export function StarfieldBackground({ seed = 42, className = '' }: StarfieldBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let stars = generateStarfield(seed, 1, 1, 300);
    let nebulae = generateNebulaBlobs(seed, 1, 1, 4);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      stars = generateStarfield(seed, rect.width, rect.height, 350);
      nebulae = generateNebulaBlobs(seed, rect.width, rect.height, 5);
    };

    resize();

    const draw = (time: number) => {
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;

      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, '#0a0e1a');
      gradient.addColorStop(0.5, '#060a14');
      gradient.addColorStop(1, '#04060c');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      drawNebulaLayer(ctx, nebulae, time);
      drawStarfieldLayer(ctx, stars, time);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [seed]);

  return <canvas ref={canvasRef} className={`starfield-bg ${className}`} aria-hidden="true" />;
}