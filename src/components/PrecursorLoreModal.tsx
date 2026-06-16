interface Props {
  lore: string;
  title?: string;
  onClose: () => void;
}

export function PrecursorLoreModal({ lore, title = 'Precursor Discovery', onClose }: Props) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-content precursor-lore-modal" onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>
        <p className="precursor-lore-text">{lore}</p>
        <button className="btn btn-primary" onClick={onClose}>Continue</button>
      </div>
    </div>
  );
}