import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

interface NotificationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose: () => void;
  duration?: number;
}

export function Notification({ type, message, onClose, duration = 5000 }: NotificationProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      iconColor: 'text-green-600'
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-600'
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-600'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-600'
    }
  };

  const { icon: Icon, bgColor, borderColor, textColor, iconColor } = config[type];

  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-up">
      <div className={`${bgColor} ${borderColor} ${textColor} border-2 rounded-xl shadow-2xl p-4 pr-12 max-w-md`}>
        <div className="flex items-center gap-3">
          <Icon className={`w-6 h-6 ${iconColor} flex-shrink-0`} />
          <p className="font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 hover:bg-black/10 rounded-lg p-1 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface NotificationState {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export function NotificationContainer() {
  const [notifications, setNotifications] = React.useState<NotificationState[]>([]);

  React.useEffect(() => {
    const handleNotification = (event: CustomEvent) => {
      const { type, message } = event.detail;
      const id = Date.now();
      setNotifications(prev => [...prev, { id, type, message }]);
    };

    window.addEventListener('show-notification' as any, handleNotification);
    return () => window.removeEventListener('show-notification' as any, handleNotification);
  }, []);

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          type={notification.type}
          message={notification.message}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

export function showNotification(type: 'success' | 'error' | 'warning' | 'info', message: string) {
  window.dispatchEvent(new CustomEvent('show-notification', { detail: { type, message } }));
}
