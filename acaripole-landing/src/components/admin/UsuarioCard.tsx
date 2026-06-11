import React, { useState } from 'react';
import type { User as UserType } from './types';
import { User, Shield, Briefcase, CheckCircle2, XCircle, Eye, Edit3, Trash2, Power } from 'lucide-react';

interface UsuarioCardProps {
  user: UserType;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleStatus?: (newStatus: boolean) => void;
}

const ROLE_CONFIG: Record<string, { bg: string; border: string; color: string; icon: React.ElementType; label: string }> = {
  Administrador: {
    bg: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(59,130,246,0.08))',
    border: 'rgba(139,92,246,0.2)',
    color: '#8B5CF6',
    icon: Shield,
    label: 'Admin',
  },
  Profesional: {
    bg: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(99,102,241,0.08))',
    border: 'rgba(59,130,246,0.2)',
    color: '#2563EB',
    icon: Briefcase,
    label: 'Profesional',
  },
  Usuario: {
    bg: 'linear-gradient(135deg, rgba(100,116,139,0.1), rgba(148,163,184,0.08))',
    border: 'rgba(100,116,139,0.2)',
    color: '#475569',
    icon: User,
    label: 'Usuario',
  },
};

interface ActionBtnProps {
  icon: React.ElementType;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  color: string;
  hoverBg: string;
  hoverColor?: string;
}

const ActionBtn: React.FC<ActionBtnProps> = ({ icon: Icon, label, onClick, color, hoverBg, hoverColor }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={label}
      style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        padding: '7px 0',
        borderRadius: 8,
        border: 'none',
        background: hov ? hoverBg : 'transparent',
        color: hov ? (hoverColor ?? color) : color,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontSize: '0.68rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase' as const,
        fontFamily: '"Hanken Grotesk", Inter, system-ui, sans-serif',
      }}
    >
      <Icon size={13} strokeWidth={2.2} />
      {label}
    </button>
  );
};

export const UsuarioCard: React.FC<UsuarioCardProps> = ({ user, onView, onEdit, onDelete, onToggleStatus }) => {
  const [hovered, setHovered] = useState(false);
  const role = ROLE_CONFIG[user.rol] ?? ROLE_CONFIG.Usuario;
  const RoleIcon = role.icon;
  const isActive = user.estado === 'Activa';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        borderRadius: '1.25rem',
        border: `1px solid ${hovered ? 'rgba(139,92,246,0.2)' : '#F0EDE8'}`,
        boxShadow: hovered
          ? '0 20px 50px rgba(139,92,246,0.1), 0 4px 12px rgba(0,0,0,0.04)'
          : '0 4px 16px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column' as const,
        position: 'relative' as const,
      }}
    >
      {/* Accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: isActive
          ? 'linear-gradient(90deg, #22C55E, #16A34A)'
          : 'linear-gradient(90deg, #F43F5E, #BE123C)',
        opacity: hovered ? 1 : 0.5,
        transition: 'opacity 0.3s ease',
      }} />

      {/* Main content */}
      <div style={{ padding: '1.5rem 1.25rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1 }}>
        {/* Avatar */}
        <div style={{ position: 'relative', marginBottom: '0.85rem' }}>
          <div style={{
            width: 72, height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #F3F0FB, #E9E8E7)',
            border: `3px solid ${hovered ? 'rgba(139,92,246,0.25)' : '#F0EDE8'}`,
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'border-color 0.3s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}>
            {user.imagen ? (
              <img src={user.imagen} alt={user.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={30} color="#A09990" />
            )}
          </div>
          <div style={{
            position: 'absolute', bottom: 1, right: 1,
            width: 18, height: 18, borderRadius: '50%',
            background: isActive ? '#22C55E' : '#F43F5E',
            border: '2px solid #FFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 2px 6px ${isActive ? 'rgba(34,197,94,0.4)' : 'rgba(244,63,94,0.4)'}`,
          }}>
            {isActive ? <CheckCircle2 size={9} color="#FFF" /> : <XCircle size={9} color="#FFF" />}
          </div>
        </div>

        {/* Name */}
        <h3 style={{
          fontFamily: '"Bodoni Moda", Georgia, serif',
          fontSize: '1rem', fontWeight: 600, color: '#1B1C1C',
          margin: '0 0 0.15rem', lineHeight: 1.3,
        }}>{user.nombre}</h3>

        {/* Email */}
        <p style={{
          fontSize: '0.72rem', color: '#9E9492', margin: '0 0 0.65rem', fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
        }}>{user.documento}</p>

        {/* Role */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: '9999px',
          background: role.bg, border: `1px solid ${role.border}`,
          fontSize: '0.68rem', fontWeight: 700, color: role.color,
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          <RoleIcon size={10} strokeWidth={2.5} />
          {role.label}
        </span>
      </div>

      {/* Specialties */}
      {user.especialidades && user.especialidades.length > 0 && (
        <div style={{
          borderTop: '1px solid #F3F0FB',
          padding: '0.65rem 1rem',
          background: 'rgba(250,249,248,0.5)',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', justifyContent: 'center' }}>
            {user.especialidades.slice(0, 3).map((esp, idx) => (
              <span key={idx} style={{
                fontSize: '0.65rem', color: '#94A3B8', background: '#FFF',
                padding: '2px 7px', borderRadius: 5, border: '1px solid #E9E8E7',
                fontWeight: 600, letterSpacing: '0.02em',
              }}>{esp}</span>
            ))}
            {user.especialidades.length > 3 && (
              <span style={{
                fontSize: '0.65rem', color: '#3B82F6',
                background: 'rgba(59,130,246,0.08)', padding: '2px 7px',
                borderRadius: 5, border: '1px solid rgba(59,130,246,0.2)', fontWeight: 600,
              }}>+{user.especialidades.length - 3}</span>
            )}
          </div>
        </div>
      )}

      {/* Action buttons row */}
      <div style={{
        borderTop: '1px solid #F0EDE8',
        padding: '0.5rem 0.5rem',
        display: 'flex',
        gap: 2,
        background: '#FAFAFA',
      }}>
        <ActionBtn
          icon={Eye} label="Ver" color="#94A3B8" hoverBg="rgba(139,92,246,0.08)" hoverColor="#8B5CF6"
          onClick={(e) => { e.stopPropagation(); onView?.(); }}
        />
        <ActionBtn
          icon={Edit3} label="Editar" color="#94A3B8" hoverBg="rgba(59,130,246,0.08)" hoverColor="#2563EB"
          onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
        />
        <ActionBtn
          icon={Power}
          label={isActive ? 'Desact.' : 'Activar'}
          color={isActive ? '#94A3B8' : '#16A34A'}
          hoverBg={isActive ? 'rgba(244,63,94,0.08)' : 'rgba(34,197,94,0.08)'}
          hoverColor={isActive ? '#E11D48' : '#16A34A'}
          onClick={(e) => { e.stopPropagation(); onToggleStatus?.(!isActive); }}
        />
        <ActionBtn
          icon={Trash2} label="Borrar" color="#9E9492" hoverBg="rgba(244,63,94,0.08)" hoverColor="#E11D48"
          onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
        />
      </div>
    </div>
  );
};
