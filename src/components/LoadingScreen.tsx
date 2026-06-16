import { StarfieldBackground } from './StarfieldBackground';

interface Props {
  message?: string;
  seed?: number;
}

export function LoadingScreen({ message = 'Initializing galaxy...', seed }: Props) {
  return (
    <div className="loading-screen">
      <StarfieldBackground seed={seed} />
      <div className="loading-screen__content">
        <h1 className="menu-title" style={{ fontSize: 'var(--text-xl)' }}>Endless Grok</h1>
        <p className="loading-screen__message">{message}</p>
        <div className="loading-screen__bar">
          <div className="loading-screen__bar-fill" />
        </div>
      </div>
    </div>
  );
}