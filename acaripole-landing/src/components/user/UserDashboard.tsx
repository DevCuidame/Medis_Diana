import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User as UserIcon, LogOut, ArrowRight, PlayCircle } from 'lucide-react';

const C = {
  gold: '#8B5CF6',
  goldLight: '#3B82F6',
  goldPale: '#38BDF8',
  bg: '#FFFFFF',
  bgPanel: '#F3F0FB',
  white: '#FFFFFF',
  text: '#1B1C1C',
  textMedium: '#5E5E5E',
  border: '#DDD6FE',
};

const FONT_BODONI = '"Bodoni Moda", Georgia, serif';
const FONT_INTER = '"Hanken Grotesk", Inter, system-ui, sans-serif';

export const UserDashboard: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: FONT_INTER, color: C.text }}>
      {/* ─── SIDEBAR ──────────────────────────────────────────────── */}
      <aside style={{ width: 260, background: C.white, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '32px 24px', borderBottom: `1px solid ${C.border}` }}>
          <h1 style={{ fontFamily: FONT_BODONI, fontSize: 24, fontWeight: 700, fontStyle: 'italic', color: C.gold, margin: 0, letterSpacing: '0.05em' }}>
            MEDIS <span style={{ fontSize: 12, fontStyle: 'normal', color: C.textMedium }}>USER</span>
          </h1>
        </div>
        
        <nav style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button style={{ ...navBtnStyle, background: C.gold, color: C.white }}>
            <UserIcon size={18} />
            Mi Panel
          </button>
          <button 
            onClick={() => navigate('/user/classes')}
            style={{ ...navBtnStyle, color: C.textMedium }}
          >
            <Calendar size={18} />
            Inscribirse a Clases
          </button>
        </nav>

        <div style={{ padding: '24px 16px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={handleLogout} style={{ ...navBtnStyle, color: '#A00', fontWeight: 600 }}>
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        {/* Top Header */}
        <header style={{ height: 80, background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px' }}>
          <h2 style={{ fontFamily: FONT_BODONI, fontSize: 22, color: C.text, margin: 0, fontWeight: 600 }}>Dashboard</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.gold, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              U
            </div>
          </div>
        </header>

        <div style={{ padding: '40px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
            {/* Próxima Clase */}
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 32, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <PlayCircle color={C.gold} size={28} />
                <h3 style={{ fontFamily: FONT_BODONI, fontSize: 20, margin: 0, color: C.text }}>Tu Próxima Clase</h3>
              </div>
              <p style={{ color: C.textMedium, fontSize: 15, marginBottom: 32, lineHeight: 1.5 }}>
                Aún no tienes clases programadas. Regístrate en tu primera clase y comienza tu viaje en MEDIS.
              </p>
              
              <button 
                onClick={() => navigate('/user/classes')}
                style={{ width: '100%', padding: '14px', background: C.gold, color: C.white, border: 'none', borderRadius: 6, fontWeight: 600, letterSpacing: '0.05em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                Ver Clases Disponibles <ArrowRight size={18} />
              </button>
            </div>

            {/* Calendario Placeholder */}
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 32, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h3 style={{ fontFamily: FONT_BODONI, fontSize: 20, margin: 0, color: C.text }}>Tu Horario</h3>
              </div>
              
              {/* Calendario Falso */}
              <div style={{ background: C.bgPanel, border: `1px dashed ${C.border}`, borderRadius: 8, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMedium }}>
                <div style={{ textAlign: 'center' }}>
                  <Calendar size={48} style={{ color: C.border, margin: '0 auto 16px auto' }} />
                  El horario se cargará aquí cuando añadas clases.
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

const navBtnStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 16px',
  borderRadius: 8,
  border: 'none',
  background: 'transparent',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
  textAlign: 'left' as const,
};
