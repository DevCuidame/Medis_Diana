import React, { useState, useEffect } from 'react'
import { X, Check, AlertCircle, Building, DoorOpen, Calendar, Clock, User, ChevronRight, ChevronLeft, Plus, Users, Sparkles } from 'lucide-react'

const C = {
  gold: '#8B5CF6',
  goldLight: '#3B82F6',
  goldPale: '#38BDF8',
  bg: '#FFFFFF',
  bgPanel: '#F3F0FB',
  bgSecondary: '#F3F0FB',
  white: '#FFFFFF',
  text: '#1B1C1C',
  textBrown: '#475569',
  textMedium: '#5E5E5E',
  textMuted: '#94A3B8',
  border: '#DDD6FE',
  borderLight: '#DDD6FE',
}

const FONT_BODONI = '"Bodoni Moda", Georgia, serif'
const FONT_INTER = '"Hanken Grotesk", Inter, system-ui, sans-serif'

interface Sede {
  id: string
  name: string
  address: string
}

interface Salon {
  id: string
  sedeId: string
  name: string
  capacity: number
}

interface Instructor {
  id: string
  firstName: string
  lastName: string
  specialties: string[]
}

interface Discipline {
  id: string
  name: string
  level: string
  duration: number
}

interface CreateClassModalProps {
  onClose: () => void
  onSuccess: (newClasses: any[]) => void // Can return multiple classes if recurring
  existingClasses: any[] // to perform availability check
  initialDate?: string
}

export const CreateClassModal: React.FC<CreateClassModalProps> = ({ onClose, onSuccess, existingClasses, initialDate }) => {
  const [step, setStep] = useState(1)

  // --- Real DB / Loaded state ---
  const [sedes, setSedes] = useState<Sede[]>([])
  const [salones, setSalones] = useState<Salon[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [instructors, setInstructors] = useState<Instructor[]>([])

  // Fetch instructors and options from backend to populate selects
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('accessToken')
        const headers = token ? { Authorization: `Bearer ${token}` } : {}

        const [profRes, optRes] = await Promise.all([
          fetch('/api/professionals', { headers }),
          fetch('/api/classes/options', { headers })
        ])

        if (profRes.ok) {
          const profData = await profRes.json()
          setInstructors(profData.data.professionals)
        }

        if (optRes.ok) {
          const optData = await optRes.json()
          setDisciplines(optData.data.disciplines)
          setSedes(optData.data.locations)
          setSalones(optData.data.rooms)
        }
      } catch (e) {
        console.error('Error fetching modal options:', e)
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [])

  // --- Step 1 Form States ---
  const [selectedSedeId, setSelectedSedeId] = useState('')
  const [selectedSalonId, setSelectedSalonId] = useState('')
  
  // Inline Sede Creation
  const [isCreatingSede, setIsCreatingSede] = useState(false)
  const [newSedeName, setNewSedeName] = useState('')
  const [newSedeAddress, setNewSedeAddress] = useState('')

  // Inline Salon Creation
  const [isCreatingSalon, setIsCreatingSalon] = useState(false)
  const [newSalonName, setNewSalonName] = useState('')
  const [newSalonCapacity, setNewSalonCapacity] = useState(12)

  // --- Step 2 Form States ---
  const [selectedDisciplineId, setSelectedDisciplineId] = useState('')
  const [customClassName, setCustomClassName] = useState('')
  const [selectedInstructorId, setSelectedInstructorId] = useState('')
  const [classType, setClassType] = useState<'grupal' | 'privada'>('grupal')

  // Auto-fill custom class name when discipline changes
  useEffect(() => {
    const disc = disciplines.find(d => d.id === selectedDisciplineId)
    if (disc) {
      setCustomClassName(disc.name)
    }
  }, [selectedDisciplineId, disciplines])

  // --- Step 3 Form States ---
  const [classDate, setClassDate] = useState(initialDate ?? '2024-10-16')
  const [classTime, setClassTime] = useState('09:00')

  useEffect(() => {
    if (initialDate) setClassDate(initialDate)
  }, [initialDate])
  const [classDuration, setClassDuration] = useState(60)
  const [classCapacity, setClassCapacity] = useState(12)
  const [registrationPrice, setRegistrationPrice] = useState(45000)
  const [recurrence, setRecurrence] = useState<'unica' | 'semanal_4' | 'semanal_8' | 'semanal_custom'>('unica')
  const [customRecurrenceWeeks, setCustomRecurrenceWeeks] = useState(4)

  // --- Step 4 Form States ---
  const [classNotes, setClassNotes] = useState('')

  // --- Helper to get dates based on recurrence ---
  const getCalculatedDates = (): Date[] => {
    if (!classDate || !classTime) return []
    const baseDate = new Date(`${classDate}T${classTime}:00`)
    if (isNaN(baseDate.getTime())) return []

    const dates: Date[] = [baseDate]

    let repeatWeeks = 0
    if (recurrence === 'semanal_4') repeatWeeks = 3 // 4 sessions total (base + 3 repeats)
    if (recurrence === 'semanal_8') repeatWeeks = 7 // 8 sessions total
    if (recurrence === 'semanal_custom') repeatWeeks = Math.max(0, customRecurrenceWeeks - 1)

    for (let i = 1; i <= repeatWeeks; i++) {
      const nextDate = new Date(baseDate.getTime())
      nextDate.setDate(baseDate.getDate() + i * 7)
      dates.push(nextDate)
    }

    return dates
  }

  // --- Availability Validation ---
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    checked: boolean
    available: boolean
    message: string
    conflictsList: { date: string; label: string; available: boolean; conflictWith?: string }[]
  }>({ checked: false, available: true, message: '', conflictsList: [] })

  // Trigger availability validation whenever Date, Time, Salon, Recurrence or Duration changes
  useEffect(() => {
    if (!selectedSedeId || !selectedSalonId || !classDate || !classTime) {
      setAvailabilityStatus({ checked: false, available: true, message: '', conflictsList: [] })
      return
    }

    const calculatedDates = getCalculatedDates()
    const salon = salones.find(s => s.id === selectedSalonId)
    const sede = sedes.find(s => s.id === selectedSedeId)

    const conflictsList: typeof availabilityStatus.conflictsList = []
    let totalConflicts = 0

    calculatedDates.forEach((dateObj) => {
      const dateStr = dateObj.toISOString().split('T')[0]
      const selectedEndTimeObj = new Date(dateObj.getTime() + classDuration * 60000)

      let hasConflict = false
      let conflictingClassName = ''

      // Compare with existing classes in calendar
      for (const c of existingClasses) {
        if (c.isMaintenance) continue

        // Check if class falls on matching salon/location
        if (c.location === salon?.name) {
          // If we have custom class date matching, check it.
          // Otherwise, in our mock weekly view, classes are repeating weekly.
          // Parse time range e.g. "09:00 – 10:30"
          if (c.time && c.name) {
            const [startStr, endStr] = c.time.split(' – ')
            if (startStr && endStr) {
              const existingStart = new Date(`${dateStr}T${startStr.padStart(5, '0')}:00`)
              const existingEnd = new Date(`${dateStr}T${endStr.padStart(5, '0')}:00`)

              if (dateObj < existingEnd && selectedEndTimeObj > existingStart) {
                // If it is in the weekly view, it repeats.
                // Or if it is a specific day, let's flag the overlap.
                // To keep it high-fidelity, check if the weekday matches or if it's the specific day.
                hasConflict = true
                conflictingClassName = c.name
                break
              }
            }
          }
        }
      }

      const dateLabel = dateObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })

      if (hasConflict) {
        totalConflicts++
        conflictsList.push({
          date: dateStr,
          label: dateLabel,
          available: false,
          conflictWith: conflictingClassName
        })
      } else {
        conflictsList.push({
          date: dateStr,
          label: dateLabel,
          available: true
        })
      }
    })

    const isFullyAvailable = totalConflicts === 0

    setAvailabilityStatus({
      checked: true,
      available: isFullyAvailable,
      message: isFullyAvailable
        ? `✅ ¡Salón disponible! Sin conflictos detectados para las ${calculatedDates.length} sesiones en ${sede?.name} (${salon?.name}).`
        : `⚠️ Se detectaron ${totalConflicts} conflictos de horario en el "${salon?.name}". Por favor revisa la disponibilidad por sesión.`,
      conflictsList
    })
  }, [selectedSedeId, selectedSalonId, classDate, classTime, classDuration, recurrence, customRecurrenceWeeks])

  // Automatically adjust capacity and defaults when classType changes
  useEffect(() => {
    if (classType === 'privada') {
      setClassCapacity(1)
    } else {
      const salon = salones.find(s => s.id === selectedSalonId)
      if (salon) {
        setClassCapacity(salon.capacity)
      } else {
        setClassCapacity(12)
      }
    }
  }, [classType, selectedSalonId])

  // --- Handlers for inline creations ---
  const handleCreateSede = () => {
    if (!newSedeName.trim()) return
    const newId = String(Date.now())
    const newS: Sede = {
      id: newId,
      name: newSedeName,
      address: newSedeAddress || 'Sin dirección registrada',
    }
    setSedes(prev => [...prev, newS])
    setSelectedSedeId(newId)
    setNewSedeName('')
    setNewSedeAddress('')
    setIsCreatingSede(false)
  }

  const handleCreateSalon = () => {
    if (!selectedSedeId) {
      alert('Por favor selecciona primero una sede.')
      return
    }
    if (!newSalonName.trim()) return
    const newId = String(Date.now())
    const newS: Salon = {
      id: newId,
      sedeId: selectedSedeId,
      name: newSalonName,
      capacity: newSalonCapacity,
    }
    setSalones(prev => [...prev, newS])
    setSelectedSalonId(newId)
    setNewSalonName('')
    setNewSalonCapacity(12)
    setIsCreatingSalon(false)
  }

  // Filter salons by selected Sede
  const filteredSalones = salones.filter((s:any) => s.location_id === selectedSedeId)

  // Submit and create (possibly multiple class items if recurring)
  const handleConfirm = async () => {
    const sede = sedes.find(s => s.id === selectedSedeId)
    const salon = salones.find(s => s.id === selectedSalonId)
    const disc = disciplines.find(d => d.id === selectedDisciplineId)
    const inst = instructors.find(i => i.id === selectedInstructorId)

    if (!sede || !salon || !disc || !inst) {
      alert('Por favor completa todos los campos requeridos.')
      return
    }

    const calculatedDates = getCalculatedDates()
    
    // Instead of just mapping local state, POST to backend to insert real rows
    try {
      const token = localStorage.getItem('accessToken')
      const headers = { 
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }

      const createdClassesFromDB = []
      
      for (let i = 0; i < calculatedDates.length; i++) {
        const dateObj = calculatedDates[i]
        const payload = {
          discipline_id: disc.id,
          professional_id: inst.id,
          room_id: salon.id,
          scheduled_at: dateObj.toISOString(),
          duration_minutes: classDuration,
          capacity: classCapacity,
          location: salon.name,
          notes: classNotes || (classType === 'privada' ? '👑 Clase Privada' : '')
        }
        
        const res = await fetch('/api/classes', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        })
        
        if (res.ok) {
          const body = await res.json()
          if (body.success) {
            createdClassesFromDB.push(body.data.class)
          }
        }
      }

      // Map backend JSON to UI format
      const newClassesForUI = createdClassesFromDB.map((dbClass, index) => {
        const startObj = new Date(dbClass.scheduledAt)
        const endObj = new Date(startObj.getTime() + dbClass.durationMinutes * 60000)
        
        const timeFormatter = (d: Date) => d.toTimeString().substring(0, 5)
        const timeRangeString = `${timeFormatter(startObj)} – ${timeFormatter(endObj)}`

        const daysMap = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
        const dayOfWeekShort = daysMap[startObj.getDay()]
        const finalName = customClassName.trim() || dbClass.discipline.name

        return {
          id: dbClass.id,
          time: timeRangeString,
          name: classType === 'privada' ? `👑 ${finalName}` : finalName,
          discipline: dbClass.discipline.name,
          price: registrationPrice,
          priceFormatted: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(registrationPrice),
          instructor: `${dbClass.instructor.firstName} ${dbClass.instructor.lastName.substring(0,1)}.`,
          initials: `${dbClass.instructor.firstName.charAt(0)}${dbClass.instructor.lastName.charAt(0)}`,
          color: classType === 'privada' ? '#38BDF8' : dbClass.discipline.name.includes('Pole') ? '#8B5CF6' : dbClass.discipline.name.includes('Flex') ? '#4A6FA5' : '#7C6B8A',
          current: dbClass.enrolledCount,
          max: dbClass.capacity,
          dayShort: dayOfWeekShort,
          dayNum: String(startObj.getDate()),
          location: dbClass.location,
          notes: dbClass.notes,
          isPrivate: classType === 'privada',
          recurrenceIndex: index + 1,
          totalRecurrences: createdClassesFromDB.length,
          level: dbClass.discipline.level
        }
      })

      onSuccess(newClassesForUI)
    } catch(err) {
      console.error(err)
      alert('Error en conexión con la base de datos al crear la clase.')
    }
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(27,28,28,0.72)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      
      <div style={{ width: '100%', maxWidth: 580, background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        
        {/* Header */}
        <header style={{ padding: '22px 28px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h3 style={{ fontFamily: FONT_BODONI, fontSize: 22, fontWeight: 700, color: C.gold, margin: 0 }}>Programar Clase Especial</h3>
            <p style={{ fontFamily: FONT_INTER, fontSize: 11, color: C.textMuted, margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Sesión Única, Recurrente, Grupal o Privada</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 4 }}>
            <X size={18} />
          </button>
        </header>

        {/* Stepper progress */}
        <div style={{ background: C.bgPanel, padding: '16px 28px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          {[
            { nr: 1, label: 'Sede & Salón' },
            { nr: 2, label: 'Clase & Tipo' },
            { nr: 3, label: 'Frecuencia & Cupo' },
            { nr: 4, label: 'Confirmación' },
          ].map(s => {
            const isActive = step === s.nr
            const isCompleted = step > s.nr
            return (
              <div key={s.nr} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? C.gold : isCompleted ? '#22c55e' : C.bgSecondary,
                  color: (isActive || isCompleted) ? C.white : C.textMuted,
                  fontFamily: FONT_INTER, fontSize: 10, fontWeight: 700
                }}>
                  {isCompleted ? <Check size={11} strokeWidth={3} /> : s.nr}
                </div>
                <span style={{
                  fontFamily: FONT_INTER, fontSize: 10,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? C.gold : C.textMuted,
                  letterSpacing: '0.02em'
                }}>{s.label}</span>
              </div>
            )
          })}
        </div>

        {/* Content Body (Scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
          
          {/* STEP 1: SEDE Y SALON */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Sede Select */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.04em' }}>🏢 1. Selecciona la Sede</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <select
                    value={selectedSedeId}
                    onChange={e => { setSelectedSedeId(e.target.value); setSelectedSalonId(''); }}
                    style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', fontFamily: FONT_INTER, fontSize: 13, color: C.text, outline: 'none' }}
                  >
                    <option value="">-- Selecciona una Sede --</option>
                    {sedes.map(s => <option key={s.id} value={s.id}>{s.name} ({s.address})</option>)}
                  </select>
                  <button
                    onClick={() => setIsCreatingSede(!isCreatingSede)}
                    style={{ padding: '0 14px', background: C.white, border: `1px dashed ${C.gold}`, borderRadius: 10, color: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                    title="Crear Nueva Sede"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Inline Sede Creation form */}
              {isCreatingSede && (
                <div style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.gold }}>✨ Nueva Sede</div>
                  <input
                    type="text"
                    placeholder="Nombre de la sede (ej: Sede Envigado)"
                    value={newSedeName}
                    onChange={e => setNewSedeName(e.target.value)}
                    style={{ width: '100%', background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', fontFamily: FONT_INTER, fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box' }}
                  />
                  <input
                    type="text"
                    placeholder="Dirección completa"
                    value={newSedeAddress}
                    onChange={e => setNewSedeAddress(e.target.value)}
                    style={{ width: '100%', background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', fontFamily: FONT_INTER, fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={() => setIsCreatingSede(false)} style={{ padding: '6px 12px', background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Cancelar</button>
                    <button onClick={handleCreateSede} style={{ padding: '6px 14px', background: C.gold, color: C.white, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Guardar Sede</button>
                  </div>
                </div>
              )}

              {/* Salon Select */}
              {selectedSedeId && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.04em' }}>🚪 2. Selecciona el Salón / Estudio</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <select
                      value={selectedSalonId}
                      onChange={e => setSelectedSalonId(e.target.value)}
                      style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', fontFamily: FONT_INTER, fontSize: 13, color: C.text, outline: 'none' }}
                    >
                      <option value="">-- Selecciona un Salón --</option>
                      {filteredSalones.map(s => <option key={s.id} value={s.id}>{s.name} (Cupo base: {s.capacity})</option>)}
                    </select>
                    <button
                      onClick={() => setIsCreatingSalon(!isCreatingSalon)}
                      style={{ padding: '0 14px', background: C.white, border: `1px dashed ${C.gold}`, borderRadius: 10, color: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      title="Crear Nuevo Salón"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Inline Salon Creation form */}
              {isCreatingSalon && (
                <div style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontFamily: FONT_INTER, fontSize: 12, fontWeight: 700, color: C.gold }}>✨ Nuevo Salón (en {sedes.find(s => s.id === selectedSedeId)?.name})</div>
                  <input
                    type="text"
                    placeholder="Nombre del salón (ej: Salón Aéreo 3)"
                    value={newSalonName}
                    onChange={e => setNewSalonName(e.target.value)}
                    style={{ width: '100%', background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', fontFamily: FONT_INTER, fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: FONT_INTER, fontSize: 11, color: C.textMuted }}>Capacidad Máxima:</span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={newSalonCapacity}
                      onChange={e => setNewSalonCapacity(Number(e.target.value))}
                      style={{ width: 80, background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px', fontFamily: FONT_INTER, fontSize: 13, color: C.text, outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={() => setIsCreatingSalon(false)} style={{ padding: '6px 12px', background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Cancelar</button>
                    <button onClick={handleCreateSalon} style={{ padding: '6px 14px', background: C.gold, color: C.white, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Guardar Salón</button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* STEP 2: CLASE, TIPO Y PROFESIONAL */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Type Select (Grupal vs Privada) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.04em' }}>👑 Tipo de Clase / Acceso</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button
                    onClick={() => setClassType('grupal')}
                    style={{
                      padding: '16px', borderRadius: 12, border: `1px solid ${classType === 'grupal' ? C.gold : C.borderLight}`,
                      background: classType === 'grupal' ? 'rgba(139,92,246,0.05)' : C.white,
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                    }}
                  >
                    <Users size={20} color={classType === 'grupal' ? C.gold : C.textMuted} />
                    <span style={{ fontFamily: FONT_INTER, fontSize: 13, fontWeight: 700, color: classType === 'grupal' ? C.gold : C.textBrown }}>Clase Grupal</span>
                    <span style={{ fontFamily: FONT_INTER, fontSize: 10, color: C.textMuted, textAlign: 'center' }}>Varios cupos disponibles para reservas generales</span>
                  </button>
                  <button
                    onClick={() => setClassType('privada')}
                    style={{
                      padding: '16px', borderRadius: 12, border: `1px solid ${classType === 'privada' ? C.gold : C.borderLight}`,
                      background: classType === 'privada' ? 'rgba(212,168,67,0.08)' : C.white,
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                    }}
                  >
                    <Sparkles size={20} color={classType === 'privada' ? C.goldLight : C.textMuted} />
                    <span style={{ fontFamily: FONT_INTER, fontSize: 13, fontWeight: 700, color: classType === 'privada' ? C.gold : C.textBrown }}>Clase Privada VIP</span>
                    <span style={{ fontFamily: FONT_INTER, fontSize: 10, color: C.textMuted, textAlign: 'center' }}>Asesoría personalizada (1 a 1), cupo bloqueado</span>
                  </button>
                </div>
              </div>

              {/* Discipline Select */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.04em' }}>🩰 Disciplina / Especialidad</label>
                <select
                  value={selectedDisciplineId}
                  onChange={e => setSelectedDisciplineId(e.target.value)}
                  style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', fontFamily: FONT_INTER, fontSize: 13, color: C.text, outline: 'none' }}
                >
                  <option value="">-- Selecciona Disciplina --</option>
                  {disciplines.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.level === 'all' ? 'Multinivel' : d.level}) - {d.duration} min</option>
                  ))}
                </select>
              </div>

              {/* Custom Class Name */}
              {selectedDisciplineId && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.04em' }}>📝 Nombre Personalizado de la Clase</label>
                  <input
                    type="text"
                    placeholder="ej: Pole Exotic Especial - Coreografía de Halloween"
                    value={customClassName}
                    onChange={e => setCustomClassName(e.target.value)}
                    style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', fontFamily: FONT_INTER, fontSize: 13, color: C.text, outline: 'none' }}
                  />
                </div>
              )}

              {/* Instructor Select */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.04em' }}>🤸 Instructora / Master Elite</label>
                  {loadingData ? (
                  <div style={{ fontFamily: FONT_INTER, fontSize: 12, color: C.textMuted }}>Cargando equipo de profesionales...</div>
                ) : (
                  <select
                    value={selectedInstructorId}
                    onChange={e => setSelectedInstructorId(e.target.value)}
                    style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', fontFamily: FONT_INTER, fontSize: 13, color: C.text, outline: 'none' }}
                  >
                    <option value="">-- Selecciona Instructora --</option>
                    {instructors.map(i => (
                      <option key={i.id} value={i.id}>{i.firstName} {i.lastName} (Especialidades: {i.specialties.join(', ')})</option>
                    ))}
                  </select>
                )}
              </div>

            </div>
          )}

          {/* STEP 3: HORARIO, FRECUENCIA Y CUPO */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              
              {/* Date & Time Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.04em' }}>📅 Fecha de Inicio</label>
                  <input
                    type="date"
                    value={classDate}
                    onChange={e => setClassDate(e.target.value)}
                    style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontFamily: FONT_INTER, fontSize: 13, color: C.text, outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.04em' }}>⏰ Hora de Inicio</label>
                  <input
                    type="time"
                    value={classTime}
                    onChange={e => setClassTime(e.target.value)}
                    style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontFamily: FONT_INTER, fontSize: 13, color: C.text, outline: 'none' }}
                  />
                </div>
              </div>

              {/* Frecuencia / Repetición */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.04em' }}>🔄 Configuración de Frecuencia / Sesiones</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <select
                    value={recurrence}
                    onChange={e => setRecurrence(e.target.value as any)}
                    style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', fontFamily: FONT_INTER, fontSize: 13, color: C.text, outline: 'none' }}
                  >
                    <option value="unica">Sesión Única (Una sola clase)</option>
                    <option value="semanal_4">Repetir semanalmente (1 mes / 4 sesiones)</option>
                    <option value="semanal_8">Repetir semanalmente (2 meses / 8 sesiones)</option>
                    <option value="semanal_custom">Repetir semanalmente (Personalizado...)</option>
                  </select>

                  {recurrence === 'semanal_custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 140 }}>
                      <input
                        type="number"
                        min={1}
                        max={16}
                        value={customRecurrenceWeeks}
                        onChange={e => setCustomRecurrenceWeeks(Math.max(1, Number(e.target.value)))}
                        style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 12px', fontFamily: FONT_INTER, fontSize: 13, color: C.text, outline: 'none', textAlign: 'center' }}
                      />
                      <span style={{ fontFamily: FONT_INTER, fontSize: 11, color: C.textMuted }}>Sems</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Duration and Custom Capacity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.04em' }}>⏱️ Duración (minutos)</label>
                  <select
                    value={classDuration}
                    onChange={e => setClassDuration(Number(e.target.value))}
                    style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 14px', fontFamily: FONT_INTER, fontSize: 13, color: C.text, outline: 'none' }}
                  >
                    <option value={45}>45 minutos</option>
                    <option value={50}>50 minutos</option>
                    <option value={60}>60 minutos</option>
                    <option value={75}>75 minutos</option>
                    <option value={90}>90 minutos</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.04em' }}>👥 Cupo de Alumnas</label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    disabled={classType === 'privada'}
                    value={classCapacity}
                    onChange={e => setClassCapacity(Number(e.target.value))}
                    style={{ background: classType === 'privada' ? C.bgSecondary : C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontFamily: FONT_INTER, fontSize: 13, color: C.text, outline: 'none', cursor: classType === 'privada' ? 'not-allowed' : 'default' }}
                  />
                </div>
              </div>

              {/* Registration Price */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.04em' }}>💰 Valor de Inscripción por Persona (COP)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: 14, fontFamily: FONT_INTER, fontSize: 13.5, color: C.textMuted, fontWeight: 700 }}>$</span>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    placeholder="ej: 45000"
                    value={registrationPrice}
                    onChange={e => setRegistrationPrice(Math.max(0, Number(e.target.value)))}
                    style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 14px 11px 26px', fontFamily: FONT_INTER, fontSize: 13, color: C.text, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <span style={{ fontFamily: FONT_INTER, fontSize: 10, color: C.textMuted }}>Monto sugerido por sesión para el acceso general o reserva de clase.</span>
              </div>

              {/* Dynamic Availability Indicator & Conflict Checklist */}
              {availabilityStatus.checked && (
                <div style={{
                  background: availabilityStatus.available ? 'rgba(34,197,94,0.05)' : 'rgba(211,47,47,0.05)',
                  border: `1px solid ${availabilityStatus.available ? '#22c55e' : '#D32F2F'}`,
                  borderRadius: 12, padding: '14px 18px',
                  display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {availabilityStatus.available ? (
                      <Check size={16} color="#22c55e" strokeWidth={3} style={{ marginTop: 2, flexShrink: 0 }} />
                    ) : (
                      <AlertCircle size={16} color="#D32F2F" style={{ marginTop: 2, flexShrink: 0 }} />
                    )}
                    <span style={{ fontFamily: FONT_INTER, fontSize: 12.5, fontWeight: 600, color: availabilityStatus.available ? '#15803d' : '#b91c1c', lineHeight: 1.4 }}>
                      {availabilityStatus.message}
                    </span>
                  </div>

                  {/* Collision Session Checklist */}
                  {recurrence !== 'unica' && availabilityStatus.conflictsList.length > 0 && (
                    <div style={{ borderTop: `1px solid ${availabilityStatus.available ? 'rgba(34,197,94,0.2)' : 'rgba(211,47,47,0.2)'}`, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontFamily: FONT_INTER, fontSize: 10.5, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 2 }}>Cronograma de Sesiones:</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 110, overflowY: 'auto', paddingRight: 4 }}>
                        {availabilityStatus.conflictsList.map((c, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: FONT_INTER }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.available ? '#22c55e' : '#ef4444' }} />
                            <span style={{ fontWeight: 600, color: C.textBrown }}>Sesión {idx + 1} ({c.label}):</span>
                            <span style={{ color: c.available ? '#16a34a' : '#b91c1c', fontWeight: 500 }}>
                              {c.available ? 'Disponible' : `Ocupado por "${c.conflictWith}"`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* STEP 4: CONFIRMACION Y NOTAS */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Summary Card */}
              <div style={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 14, padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.borderLight}`, paddingBottom: 10, marginBottom: 16 }}>
                  <h4 style={{ fontFamily: FONT_BODONI, fontSize: 18, fontWeight: 700, color: C.gold, margin: 0 }}>Resumen del Programa</h4>
                  <div style={{
                    padding: '4px 12px', borderRadius: 6,
                    background: classType === 'privada' ? 'rgba(212,168,67,0.12)' : 'rgba(139,92,246,0.08)',
                    fontFamily: FONT_INTER, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em',
                    color: classType === 'privada' ? C.goldLight : C.gold, textTransform: 'uppercase'
                  }}>
                    {classType === 'privada' ? '👑 Clase Privada' : '👥 Clase Grupal'}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Building size={16} color={C.gold} />
                    <span style={{ fontFamily: FONT_INTER, fontSize: 12.5, color: C.textBrown }}>
                      <strong>Sede:</strong> {sedes.find(s => s.id === selectedSedeId)?.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <DoorOpen size={16} color={C.gold} />
                    <span style={{ fontFamily: FONT_INTER, fontSize: 12.5, color: C.textBrown }}>
                      <strong>Salón:</strong> {salones.find(s => s.id === selectedSalonId)?.name} (Cupo: {classCapacity} {classCapacity === 1 ? 'alumna' : 'alumnas'})
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <User size={16} color={C.gold} />
                    <span style={{ fontFamily: FONT_INTER, fontSize: 12.5, color: C.textBrown }}>
                      <strong>Clase:</strong> {customClassName.trim() || disciplines.find(d => d.id === selectedDisciplineId)?.name} con <strong>{instructors.find(i => i.id === selectedInstructorId)?.firstName} {instructors.find(i => i.id === selectedInstructorId)?.lastName}</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, width: 16, display: 'inline-block', textAlign: 'center', color: C.gold, fontWeight: 'bold', fontFamily: FONT_INTER }}>$</span>
                    <span style={{ fontFamily: FONT_INTER, fontSize: 12.5, color: C.textBrown }}>
                      <strong>Valor de Inscripción:</strong> {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(registrationPrice)} por alumna
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Calendar size={16} color={C.gold} />
                    <span style={{ fontFamily: FONT_INTER, fontSize: 12.5, color: C.textBrown }}>
                      <strong>Frecuencia:</strong> {recurrence === 'unica' ? 'Sesión Única' : `Recurrente semanal (${getCalculatedDates().length} sesiones)`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Clock size={16} color={C.gold} />
                    <span style={{ fontFamily: FONT_INTER, fontSize: 12.5, color: C.textBrown }}>
                      <strong>Horario:</strong> {classTime} ({classDuration} minutos)
                    </span>
                  </div>
                </div>
              </div>

              {/* Show Dates list if recurring */}
              {recurrence !== 'unica' && (
                <div style={{ background: C.bg, border: `1px solid ${C.borderLight}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>📅 Fechas del Cronograma a Generar</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {getCalculatedDates().map((d, i) => (
                      <div key={i} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px', fontSize: 11, fontFamily: FONT_INTER, fontWeight: 600, color: C.textBrown }}>
                        {i + 1}. {d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Class Notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, color: C.textBrown, textTransform: 'uppercase', letterSpacing: '0.04em' }}>📝 Notas Especiales para Alumnas</label>
                <textarea
                  placeholder="ej: Traer shorts, rodilleras y toalla pequeña para pole"
                  value={classNotes}
                  onChange={e => setClassNotes(e.target.value)}
                  rows={3}
                  style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', fontFamily: FONT_INTER, fontSize: 13, color: C.text, outline: 'none', resize: 'vertical' }}
                />
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <footer style={{ padding: '20px 28px', borderTop: `1px solid ${C.borderLight}`, background: C.bgPanel, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          {step > 1 ? (
            <button
              onClick={() => setStep(prev => prev - 1)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textBrown, cursor: 'pointer' }}
            >
              <ChevronLeft size={14} strokeWidth={2.5} />
              Atrás
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(prev => prev + 1)}
              disabled={
                (step === 1 && (!selectedSedeId || !selectedSalonId)) ||
                (step === 2 && (!selectedDisciplineId || !selectedInstructorId)) ||
                (step === 3 && (!availabilityStatus.available || !classDate || !classTime))
              }
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 22px',
                background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
                color: C.white, border: 'none', borderRadius: 8,
                fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                opacity: (
                  (step === 1 && (!selectedSedeId || !selectedSalonId)) ||
                  (step === 2 && (!selectedDisciplineId || !selectedInstructorId)) ||
                  (step === 3 && (!availabilityStatus.available || !classDate || !classTime))
                ) ? 0.45 : 1,
                boxShadow: `0 4px 16px rgba(139,92,246,0.20)`
              }}
            >
              Siguiente
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px',
                background: `linear-gradient(135deg, #15803d, #22c55e)`,
                color: C.white, border: 'none', borderRadius: 8,
                fontFamily: FONT_INTER, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                boxShadow: `0 4px 16px rgba(22,163,74,0.28)`
              }}
            >
              <Check size={14} strokeWidth={3} />
              Confirmar y Crear
            </button>
          )}
        </footer>

      </div>
    </div>
  )
}
