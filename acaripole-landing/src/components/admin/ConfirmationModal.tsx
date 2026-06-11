import React from 'react';
import { X, Check } from 'lucide-react';

interface ConfirmationModalProps {
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  message = '¿Estás seguro de que deseas eliminar este elemento?',
  onConfirm,
  onCancel,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(27,28,28,0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '1.25rem',
          padding: '2rem 1.5rem',
          width: '90%',
          maxWidth: 360,
          boxShadow: '0 12px 36px rgba(0,0,0,0.15)',
        }}
      >
        <p style={{ marginBottom: '1.5rem', fontSize: '1rem', color: '#1B1C1C' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              background: '#F0EDE8',
              border: '1px solid #DDD6FE',
              borderRadius: '8px',
              color: '#1B1C1C',
              cursor: 'pointer',
            }}
          >
            <X size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              background: '#E11D48',
              border: 'none',
              borderRadius: '8px',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <Check size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};
