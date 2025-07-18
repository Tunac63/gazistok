// src/components/Toast.jsx - Modern bildirim sistemi

import React, { useState, useEffect } from 'react';

const Toast = ({ message, type = 'info', isVisible, onClose, duration = 4000 }) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const getToastStyles = () => {
    const baseStyles = {
      position: 'fixed',
      top: window.innerWidth <= 768 ? '10px' : '20px',
      right: window.innerWidth <= 768 ? '10px' : '20px',
      left: window.innerWidth <= 768 ? '10px' : 'auto',
      zIndex: 9999,
      padding: window.innerWidth <= 768 ? '12px 16px' : '16px 20px',
      borderRadius: window.innerWidth <= 768 ? '8px' : '12px',
      color: 'white',
      fontWeight: '600',
      fontSize: window.innerWidth <= 768 ? '12px' : '14px',
      minWidth: window.innerWidth <= 768 ? 'auto' : '300px',
      maxWidth: window.innerWidth <= 768 ? 'calc(100vw - 20px)' : '400px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
      transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
      transition: 'all 0.3s ease-in-out',
      display: 'flex',
      alignItems: 'center',
      gap: window.innerWidth <= 768 ? '8px' : '12px',
      cursor: 'pointer',
      whiteSpace: 'pre-line',
      wordBreak: window.innerWidth <= 768 ? 'break-word' : 'normal'
    };

    const typeStyles = {
      success: {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        border: '1px solid #065f46'
      },
      error: {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        border: '1px solid #991b1b'
      },
      warning: {
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        border: '1px solid #92400e'
      },
      info: {
        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        border: '1px solid #1e40af'
      }
    };

    return { ...baseStyles, ...typeStyles[type] };
  };

  const getIcon = () => {
    const iconMap = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return iconMap[type] || 'ℹ️';
  };

  return (
    <div style={getToastStyles()} onClick={onClose}>
      <div style={{ fontSize: window.innerWidth <= 768 ? '14px' : '18px' }}>
        {getIcon()}
      </div>
      <div style={{ flex: 1, whiteSpace: 'pre-line', lineHeight: '1.4' }}>
        {message}
      </div>
      <div style={{ 
        fontSize: window.innerWidth <= 768 ? '12px' : '16px', 
        opacity: 0.8,
        cursor: 'pointer',
        padding: window.innerWidth <= 768 ? '1px 4px' : '2px 6px',
        borderRadius: '4px',
        transition: 'background-color 0.2s'
      }}
      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
      >
        ✕
      </div>
    </div>
  );
};

// Toast yöneticisi hook'u
export const useToast = () => {
  const [toast, setToast] = useState({ 
    isVisible: false, 
    message: '', 
    type: 'info' 
  });

  const showToast = (message, type = 'info', duration = 4000) => {
    setToast({ isVisible: true, message, type, duration });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const ToastComponent = () => (
    <Toast
      message={toast.message}
      type={toast.type}
      isVisible={toast.isVisible}
      onClose={hideToast}
      duration={toast.duration}
    />
  );

  return {
    showToast,
    hideToast,
    ToastComponent,
    // Hızlı metodlar
    showSuccess: (message) => showToast(message, 'success'),
    showError: (message) => showToast(message, 'error'), 
    showWarning: (message) => showToast(message, 'warning'),
    showInfo: (message) => showToast(message, 'info')
  };
};

export default Toast;
