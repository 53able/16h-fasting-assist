/**
 * NotificationBanner Component
 * In-app banner for milestone notifications. Renders even when push permission is denied.
 * Auto-dismisses after 5 seconds or on manual close.
 */

import { useEffect, useRef } from 'react';

export interface NotificationBannerProps {
  visible: boolean;
  message: string;
  onClose: () => void;
  type?: 'info' | 'success' | 'warning';
}

const TYPE_STYLES: Record<NonNullable<NotificationBannerProps['type']>, React.CSSProperties> = {
  info: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    color: '#1e40af',
  },
  success: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
    color: '#166534',
  },
  warning: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    color: '#92400e',
  },
};

export function NotificationBanner({
  visible,
  message,
  onClose,
  type = 'info',
}: NotificationBannerProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      timerRef.current = setTimeout(() => {
        onClose();
      }, 5000);
    }

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, onClose]);

  if (!visible) {
    return null;
  }

  const typeStyle = TYPE_STYLES[type];

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-label={message}
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '10px',
        border: `2px solid ${typeStyle.borderColor}`,
        backgroundColor: typeStyle.backgroundColor,
        color: typeStyle.color,
        fontWeight: 600,
        fontSize: '0.9375rem',
        maxWidth: '480px',
        width: 'calc(100% - 32px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
      }}
    >
      <span style={{ flex: 1, lineHeight: 1.4 }}>{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="通知を閉じる"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          flexShrink: 0,
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          color: typeStyle.color,
          fontSize: '1.125rem',
          padding: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
