/**
 * SOSButton Component
 * Prominent emergency button for recording SOS events during fasting.
 */

interface SOSButtonProps {
  onSOSPress: () => void;
}

export function SOSButton({ onSOSPress }: SOSButtonProps) {
  return (
    <button
      type="button"
      onClick={onSOSPress}
      aria-label="緊急時 SOS - 断食を中断して食事を記録する"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '14px 32px',
        borderRadius: '12px',
        border: '3px solid #dc2626',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        fontWeight: 700,
        fontSize: '1.125rem',
        cursor: 'pointer',
        letterSpacing: '0.05em',
        transition: 'background-color 0.15s ease, transform 0.1s ease',
        userSelect: 'none',
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '1.5rem' }}>🆘</span>
      緊急時 SOS
    </button>
  );
}
