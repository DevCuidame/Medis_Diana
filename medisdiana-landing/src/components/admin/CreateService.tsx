import React, { useState } from 'react';
import { Bell, Menu } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { ServiciosDashboard } from './ServiciosDashboard';
import './MainDashboard.css';

const C = {
  gold: '#8B5CF6',
  bg: '#FFFFFF',
  bgPanel: '#F3F0FB',
  white: '#FFFFFF',
  text: '#1B1C1C',
  border: '#DDD6FE',
  borderLight: '#DDD6FE',
}

const FONT_BODONI = '"Bodoni Moda", Georgia, serif'
const FONT_INTER = '"Hanken Grotesk", Inter, system-ui, sans-serif'

export const CreateService: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="dashboard-container" style={{ background: C.bg, color: C.text, fontFamily: FONT_INTER }}>
      {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
      <AdminSidebar isMobileOpen={isMobileMenuOpen} onCloseMobile={() => setIsMobileMenuOpen(false)} />

      {/* ── MAIN ────────────────────────────────────────────────────── */}
      <div className="main-content">

        {/* TOPBAR */}
        <header style={{ height: 68, background: C.white, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="menu-toggle" onClick={() => setIsMobileMenuOpen(v => !v)}><Menu size={20} /></button>
            <h2 style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 600, color: C.gold, margin: 0 }}>MEDIS</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={{ width: 36, height: 36, borderRadius: 10, background: C.bgPanel, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold }}><Bell size={16} /></button>
            <div style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${C.gold}`, overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}>
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100&h=100" alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
          <ServiciosDashboard />
        </main>
      </div>
    </div>
  );
};
