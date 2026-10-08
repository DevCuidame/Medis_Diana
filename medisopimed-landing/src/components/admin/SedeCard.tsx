import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, MapPin, Phone, Eye, Edit3, Trash2, MoreVertical } from 'lucide-react';
import type { Sede } from './SedeTypes';

interface SedeCardProps {
  sede: Sede;
  onView: (sede: Sede) => void;
  onEdit: (sede: Sede) => void;
  onDelete: (sede: Sede) => void;
  onToggleStatus: (id: string, newStatus: boolean) => void;
}

export const SedeCard: React.FC<SedeCardProps> = ({ sede, onView, onEdit, onDelete, onToggleStatus }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={`bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] relative transition-opacity duration-300 ${!sede.isActive ? 'opacity-60' : ''}`}
    >
      {/* MENU DESPLEGABLE */}
      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors focus:outline-none"
        >
          <MoreVertical size={16} />
        </button>

        <AnimatePresence>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-100 shadow-xl rounded-xl py-1 z-20"
              >
                <button 
                  onClick={() => { setShowMenu(false); onView(sede); }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-[#9B7B22] flex items-center gap-2 transition-colors"
                >
                  <Eye size={14} /> Ver Detalles
                </button>
                <button 
                  onClick={() => { setShowMenu(false); onEdit(sede); }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-[#9B7B22] flex items-center gap-2 transition-colors"
                >
                  <Edit3 size={14} /> Editar
                </button>
                <div className="h-px bg-slate-100 my-1 mx-2" />
                <button 
                  onClick={() => { setShowMenu(false); onDelete(sede); }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors"
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* CONTENIDO */}
      <div className="pr-8 mb-4">
        <h3 className="text-xl font-serif font-bold text-slate-900 mb-1 tracking-tight">
          {sede.name}
        </h3>
        <div className="flex items-center gap-1.5 text-slate-500 text-sm">
          <MapPin size={14} />
          <span className="truncate">{sede.address}, {sede.city}</span>
        </div>
        {sede.phone && (
          <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1">
            <Phone size={14} />
            <span>{sede.phone}</span>
          </div>
        )}
      </div>

      <div className="h-px w-full bg-slate-50 mb-4" />

      {/* FOOTER & SWITCH ESTADO */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className={`w-2 h-2 rounded-full ${sede.isActive ? 'bg-green-500' : 'bg-slate-300'}`} 
          />
          <span className={`text-xs font-medium uppercase tracking-wider ${sede.isActive ? 'text-green-700' : 'text-slate-500'}`}>
            {sede.isActive ? 'Activa' : 'Inactiva'}
          </span>
        </div>

        <button 
          onClick={() => onToggleStatus(sede.id, !sede.isActive)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${sede.isActive ? 'bg-[#9B7B22]' : 'bg-slate-200'}`}
        >
          <motion.span
            layout
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow ${sede.isActive ? 'translate-x-5' : 'translate-x-1'}`}
          />
        </button>
      </div>
    </motion.div>
  );
};
