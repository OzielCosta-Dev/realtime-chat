import { useEffect } from 'react';
import './ConfirmDialog.css';

/**
 * A controlled confirmation modal — the parent owns whether it's open and
 * what happens on confirm, this component only owns how it looks and how
 * it closes. Used for destructive actions (deleting a room) where the
 * browser's native confirm() would work but reads as an unstyled, jarring
 * interruption inconsistent with the rest of the app.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}) {
  // Escape closes it — the keyboard-accessible equivalent of clicking the
  // backdrop, and something users reflexively try on any modal.
  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        className="dialog-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        // Stop the click from bubbling to the backdrop — otherwise clicking
        // anywhere on the card itself would also close it.
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="dialog-title">{title}</h2>
        <p>{message}</p>
        <div className="dialog-actions">
          <button type="button" className="dialog-cancel" onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'dialog-confirm danger' : 'dialog-confirm'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
