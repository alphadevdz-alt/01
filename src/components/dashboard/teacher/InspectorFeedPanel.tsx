import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { InspectorNote } from '../../../types/spex';
import {
  CURRENT_INSPECTOR_NAME,
  INSPECTOR_NOTE_MODULE_REF,
} from '../../../constants/teacherDashboard.constants';

interface InspectorFeedPanelProps {
  inspectorNotes: InspectorNote[];
}

function getNoteBadge(note: InspectorNote): { className: string; label: string } {
  if (note.moduleRef === INSPECTOR_NOTE_MODULE_REF.SEMINAR_INVITATION) {
    return {
      className: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      label: '🎓 دعوة لندوة تربوية / يوم تكويني',
    };
  }
  if (note.moduleRef === INSPECTOR_NOTE_MODULE_REF.VISIT_ALERT) {
    return {
      className: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
      label: '🔔 تنبيه بزيارة تفقدية',
    };
  }
  return {
    className: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    label: '📝 توجيه وملاحظة بيداغوجية',
  };
}

export const InspectorFeedPanel: React.FC<InspectorFeedPanelProps> = ({ inspectorNotes }) => {
  return (
    <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 shadow-md border border-emerald-800/40 relative overflow-hidden space-y-3">
      <div className="flex items-center justify-between border-b border-emerald-800/50 pb-3">
        <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>إشعارات المفتش البيداغوجي: {CURRENT_INSPECTOR_NAME}</span>
        </span>
        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-md border border-emerald-500/30">
          {inspectorNotes.length} رسائل
        </span>
      </div>

      {inspectorNotes.length > 0 ? (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {inspectorNotes.map((note) => {
            const badge = getNoteBadge(note);
            return (
              <div
                key={note.id}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10 space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span
                    className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                  <span className="text-[10px] text-emerald-200/70">{note.priority}</span>
                </div>
                <h4 className="text-xs font-bold text-white leading-snug">{note.title}</h4>
                <p className="text-xs text-emerald-100/90 leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/5">
                  "{note.content}"
                </p>
                <div className="flex items-center justify-between text-[10px] text-emerald-300/80 pt-0.5">
                  <span>المفتش: {CURRENT_INSPECTOR_NAME}</span>
                  <span className="dir-ltr">{note.createdAt?.split('T')[0]}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-300 italic">
          لا توجد رسائل أو دعوات تفتيشية مسجلة حالياً.
        </p>
      )}
    </div>
  );
};
