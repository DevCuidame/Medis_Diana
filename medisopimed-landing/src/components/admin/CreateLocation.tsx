import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import './MainDashboard.css';

const C = { gold: '#8B5CF6', bg: '#FFFFFF', white: '#FFFFFF', text: '#1B1C1C', textMedium: '#5E5E5E', border: '#DDD6FE' };
const FONT_BODONI = '"Bodoni Moda", Georgia, serif';
const FONT_INTER = '"Hanken Grotesk", Inter, system-ui, sans-serif';

export const CreateLocation: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="dashboard-container" style={{ background: C.bg, color: C.text, fontFamily: FONT_INTER }}>
      <AdminSidebar isMobileOpen={isMobileMenuOpen} onCloseMobile={() => setIsMobileMenuOpen(false)} />

      <div className="main-content">
        <header style={{ height: 68, background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="menu-toggle" onClick={() => setIsMobileMenuOpen(v => !v)}><Menu size={20} /></button>
            <h2 style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 600, color: C.gold, margin: 0 }}>MEDIS</h2>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '32px 28px' }}>
          <div style={{ maxWidth: 1140, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <p style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Sedes</p>
                <h1 style={{ fontFamily: FONT_BODONI, fontSize: 42, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1 }}>Creación de Sedes</h1>
              </div>
            </div>
            <div style={{ maxWidth: 800, padding: 32, background: C.white, borderRadius: 16, border: `1px solid ${C.border}` }}>
              <p style={{ color: C.textMedium }}>Formulario de creación de sedes (en construcción).</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
