import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Plus, Search, Pencil, Trash2, X, Check, Menu, Bell,
  AlertTriangle, Layers, PackageX,
} from 'lucide-react'
import { AdminSidebar } from './AdminSidebar'

const C = {
  gold: '#8B5CF6', goldLight: '#3B82F6',
  bg: '#FAFAFA', bgPanel: '#F3F0FB',
  white: '#FFFFFF', text: '#1B1C1C', textBrown: '#475569',
  textMedium: '#5E5E5E', textMuted: '#94A3B8',
  border: '#DDD6FE', borderLight: '#DDD6FE',
}
const FONT_BODONI = '"Bodoni Moda", Georgia, serif'
const FONT_INTER  = '"Hanken Grotesk", Inter, system-ui, sans-serif'

const CATEGORIES = ['Medicamentos', 'Insumos médicos', 'Equipos', 'Papelería', 'Aseo y desinfección']
const UNITS = ['unidades', 'cajas', 'frascos', 'paquetes', 'litros']

// Sin API de inventario en el backend: los ítems se persisten en localStorage.
const STORAGE_KEY = 'MEDIS_inventory'

interface InventoryItem {
  id: string
  name: string
  category: string
  quantity: number
  minStock: number
  unit: string
  notes: string
  updatedAt: string
}

type ItemStatus = 'ok' | 'low' | 'out'

function itemStatus(it: InventoryItem): ItemStatus {
  if (it.quantity <= 0) return 'out'
  if (it.quantity <= it.minStock) return 'low'
  return 'ok'
}

const STATUS_META: Record<ItemStatus, { label: string; color: string; bg: string }> = {
  ok:  { label: 'Disponible', color: '#16A34A', bg: 'rgba(34,197,94,0.10)' },
  low: { label: 'Stock bajo', color: '#D97706', bg: 'rgba(245,158,11,0.12)' },
  out: { label: 'Agotado',    color: '#DC2626', bg: 'rgba(239,68,68,0.10)' },
}

function loadItems(): InventoryItem[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

interface FormState {
  name: string; category: string; quantity: string; minStock: string; unit: string; notes: string
}
const EMPTY_FORM: FormState = { name: '', category: CATEGORIES[0], quantity: '', minStock: '', unit: UNITS[0], notes: '' }

export const InventarioDashboard: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [items, setItems] = useState<InventoryItem[]>(loadItems)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('todas')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const persist = (next: InventoryItem[]) => {
    setItems(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items
      .filter(it => categoryFilter === 'todas' || it.category === categoryFilter)
      .filter(it => !q || it.name.toLowerCase().includes(q) || it.category.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [items, search, categoryFilter])

  const lowCount = items.filter(it => itemStatus(it) === 'low').length
  const outCount = items.filter(it => itemStatus(it) === 'out').length

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (it: InventoryItem) => {
    setEditingId(it.id)
    setForm({ name: it.name, category: it.category, quantity: String(it.quantity), minStock: String(it.minStock), unit: it.unit, notes: it.notes })
    setFormError('')
    setShowForm(true)
  }

  const saveForm = () => {
    const name = form.name.trim()
    const quantity = Number(form.quantity)
    const minStock = Number(form.minStock || 0)
    if (!name) { setFormError('El nombre es requerido'); return }
    if (!Number.isFinite(quantity) || quantity < 0) { setFormError('Cantidad inválida'); return }
    if (!Number.isFinite(minStock) || minStock < 0) { setFormError('Stock mínimo inválido'); return }

    const now = new Date().toISOString()
    if (editingId) {
      persist(items.map(it => it.id === editingId
        ? { ...it, name, category: form.category, quantity, minStock, unit: form.unit, notes: form.notes.trim(), updatedAt: now }
        : it))
    } else {
      persist([...items, {
        id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name, category: form.category, quantity, minStock, unit: form.unit, notes: form.notes.trim(), updatedAt: now,
      }])
    }
    setShowForm(false)
  }

  const adjustQuantity = (id: string, delta: number) => {
    persist(items.map(it => it.id === id
      ? { ...it, quantity: Math.max(0, it.quantity + delta), updatedAt: new Date().toISOString() }
      : it))
  }

  const INPUT: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#FAFAF9', border: `1.5px solid ${C.border}`,
    borderRadius: 10, padding: '12px 14px',
    fontFamily: FONT_INTER, fontSize: 14, color: C.text, outline: 'none',
  }
  const LABEL: React.CSSProperties = {
    fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown,
    letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6,
  }

  const KPIS = [
    { icon: Package,       label: 'Total de Ítems', value: items.length,  color: C.gold },
    { icon: AlertTriangle, label: 'Stock Bajo',     value: lowCount,      color: '#D97706' },
    { icon: PackageX,      label: 'Agotados',       value: outCount,      color: '#DC2626' },
    { icon: Layers,        label: 'Categorías',     value: new Set(items.map(i => i.category)).size, color: C.goldLight },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, color: C.text, overflow: 'hidden', fontFamily: FONT_INTER }}>
      <style>{`
        @media (min-width: 769px) { .menu-toggle-btn { display: none !important; } }
        @media (max-width: 768px) { .inv-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>

      <AdminSidebar isMobileOpen={isMobileMenuOpen} onCloseMobile={() => setIsMobileMenuOpen(false)} />

      {/* ── MAIN AREA ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* TOPBAR */}
        <header style={{
          height: 72, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${C.borderLight}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 30,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="menu-toggle-btn" onClick={() => setIsMobileMenuOpen(v => !v)}
              style={{ width: 40, height: 40, borderRadius: 10, background: C.bgPanel, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold }}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <h2 style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1 }}>Inventario</h2>
              <p style={{ fontSize: 12, color: C.textMuted, margin: 0, marginTop: 3, fontWeight: 500 }}>Controla insumos, medicamentos y equipos del consultorio</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={{ width: 40, height: 40, borderRadius: 12, background: C.bgPanel, border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.gold }}>
              <Bell size={17} />
            </button>
            <div style={{ width: 40, height: 40, borderRadius: 12, border: `2.5px solid ${C.gold}`, overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 10px rgba(139,92,246,0.2)' }}>
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100&h=100" alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* KPIs */}
          <div className="inv-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {KPIS.map(k => {
              const Icon = k.icon
              return (
                <div key={k.label} style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 16, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${k.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} color={k.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>{k.label}</div>
                    <div style={{ fontFamily: FONT_BODONI, fontSize: 24, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>{k.value}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <Search size={15} color={C.textMuted} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o categoría…"
                style={{ ...INPUT, paddingLeft: 40, background: C.white }}
              />
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              style={{ ...INPUT, width: 'auto', background: C.white, cursor: 'pointer' }}
            >
              <option value="todas">Todas las categorías</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              onClick={openCreate}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, color: C.white, border: 'none', borderRadius: 10, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 4px 16px rgba(139,92,246,0.3)' }}
            >
              <Plus size={15} strokeWidth={3} />
              Nuevo Ítem
            </button>
          </div>

          {/* Table / empty state */}
          {filtered.length === 0 ? (
            <div style={{ background: C.white, border: `1px dashed ${C.border}`, borderRadius: 16, padding: '56px 24px', textAlign: 'center' }}>
              <Package size={36} color={C.textMuted} style={{ marginBottom: 12 }} />
              <p style={{ fontFamily: FONT_BODONI, fontSize: 18, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>
                {items.length === 0 ? 'Inventario vacío' : 'Sin resultados'}
              </p>
              <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
                {items.length === 0
                  ? 'Registra el primer insumo, medicamento o equipo del consultorio.'
                  : 'Ningún ítem coincide con la búsqueda o el filtro.'}
              </p>
            </div>
          ) : (
            <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.borderLight}`, background: C.bgPanel }}>
                      {['Ítem', 'Categoría', 'Cantidad', 'Stock mínimo', 'Estado', 'Acciones'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '13px 18px', fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(it => {
                      const st = STATUS_META[itemStatus(it)]
                      return (
                        <tr key={it.id} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{it.name}</div>
                            {it.notes && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{it.notes}</div>}
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: 13, color: C.textBrown, fontWeight: 500 }}>{it.category}</td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button onClick={() => adjustQuantity(it.id, -1)} title="Restar 1"
                                style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, cursor: 'pointer', color: C.textBrown, fontWeight: 700, lineHeight: 1 }}>−</button>
                              <span style={{ fontSize: 14, fontWeight: 700, color: C.text, minWidth: 34, textAlign: 'center' }}>{it.quantity}</span>
                              <button onClick={() => adjustQuantity(it.id, 1)} title="Sumar 1"
                                style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, cursor: 'pointer', color: C.textBrown, fontWeight: 700, lineHeight: 1 }}>+</button>
                              <span style={{ fontSize: 12, color: C.textMuted }}>{it.unit}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: 13, color: C.textBrown }}>{it.minStock} {it.unit}</td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, padding: '5px 12px', borderRadius: 9999, whiteSpace: 'nowrap' }}>{st.label}</span>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => openEdit(it)} title="Editar"
                                style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.border}`, background: C.white, cursor: 'pointer', color: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => setDeletingId(it.id)} title="Eliminar"
                                style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(220,38,38,0.25)', background: C.white, cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── MODAL crear/editar ───────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <div onClick={() => setShowForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,8,6,0.55)', backdropFilter: 'blur(5px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.97 }}
              onClick={e => e.stopPropagation()}
              style={{ background: C.white, borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 40px 100px rgba(0,0,0,0.28)', padding: 26 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <p style={{ fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700, color: C.gold, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 4px' }}>Inventario</p>
                  <h2 style={{ fontFamily: FONT_BODONI, fontSize: 20, fontWeight: 600, color: C.text, margin: 0 }}>
                    {editingId ? 'Editar Ítem' : 'Nuevo Ítem'}
                  </h2>
                </div>
                <button onClick={() => setShowForm(false)} style={{ width: 33, height: 33, borderRadius: 9, background: C.bgPanel, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMedium }}>
                  <X size={15} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={LABEL}>Nombre <span style={{ color: '#ef4444' }}>*</span></label>
                  <input value={form.name} placeholder="Guantes de nitrilo talla M"
                    onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormError('') }}
                    style={INPUT} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={LABEL}>Categoría</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...INPUT, cursor: 'pointer' }}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LABEL}>Unidad</label>
                    <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={{ ...INPUT, cursor: 'pointer' }}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LABEL}>Cantidad <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="number" min={0} value={form.quantity} placeholder="0"
                      onChange={e => { setForm(f => ({ ...f, quantity: e.target.value })); setFormError('') }}
                      style={INPUT} />
                  </div>
                  <div>
                    <label style={LABEL}>Stock mínimo</label>
                    <input type="number" min={0} value={form.minStock} placeholder="0"
                      onChange={e => { setForm(f => ({ ...f, minStock: e.target.value })); setFormError('') }}
                      style={INPUT} />
                  </div>
                </div>
                <div>
                  <label style={LABEL}>Notas</label>
                  <textarea rows={3} value={form.notes} placeholder="Proveedor, ubicación, fecha de vencimiento…"
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    style={{ ...INPUT, resize: 'none', lineHeight: 1.6 }} />
                </div>

                {formError && (
                  <div style={{ background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#D32F2F', fontWeight: 500 }}>
                    {formError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                  <button onClick={() => setShowForm(false)}
                    style={{ padding: '11px 18px', background: 'transparent', border: `1.5px solid ${C.border}`, borderRadius: 9, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.textBrown, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={saveForm}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 22px', background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border: 'none', borderRadius: 9, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.white, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 4px 14px rgba(139,92,246,0.30)' }}>
                    <Check size={14} strokeWidth={2.5} />
                    {editingId ? 'Guardar Cambios' : 'Crear Ítem'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL confirmar eliminación ──────────────────────────────── */}
      <AnimatePresence>
        {deletingId && (
          <div onClick={() => setDeletingId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,8,6,0.55)', backdropFilter: 'blur(5px)', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{ background: C.white, borderRadius: 18, width: '100%', maxWidth: 380, boxShadow: '0 40px 100px rgba(0,0,0,0.28)', padding: 24, textAlign: 'center' }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(239,68,68,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Trash2 size={20} color="#DC2626" />
              </div>
              <h3 style={{ fontFamily: FONT_BODONI, fontSize: 18, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>¿Eliminar ítem?</h3>
              <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 20px' }}>
                Se eliminará <strong>{items.find(i => i.id === deletingId)?.name}</strong> del inventario. Esta acción no se puede deshacer.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setDeletingId(null)}
                  style={{ padding: '11px 18px', background: 'transparent', border: `1.5px solid ${C.border}`, borderRadius: 9, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.textBrown, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={() => { persist(items.filter(i => i.id !== deletingId)); setDeletingId(null) }}
                  style={{ padding: '11px 22px', background: '#DC2626', border: 'none', borderRadius: 9, fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.white, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
