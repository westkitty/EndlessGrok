interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="overlay-content confirm-dialog" onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: 20 }}>{message}</p>
        <div className="action-buttons" style={{ justifyContent: 'center' }}>
          <button className="btn" onClick={onCancel}>{cancelLabel}</button>
          <button className="btn btn-primary" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}