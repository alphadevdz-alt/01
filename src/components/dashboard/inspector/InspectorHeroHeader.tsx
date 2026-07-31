import React from 'react';
import { ShieldCheck, Megaphone, MessageSquare, Plus } from 'lucide-react';
import { User } from '../../../types/spex';

interface InspectorHeroHeaderProps {
  inspector: User;
  activeTab: 'overview' | 'chat';
  onToggleActiveTab: () => void;
  onOpenBroadcastModal: () => void;
  onOpenVisitModal: () => void;
}

export const InspectorHeroHeader: React.FC<InspectorHeroHeaderProps> = ({
  inspector,
  activeTab,
  onToggleActiveTab,
  onOpenBroadcastModal,
  onOpenVisitModal,
}) => {
  const directorateText =
    inspector.directorateId === 'setif_de'
      ? 'مديرية التربية لولاية سطيف'
      : inspector.directorateId || 'مديرية التربية والتعليم';

  const districtText =
    inspector.districtId === 'dist_setif_7'
      ? 'المقاطعة 07 (عين أزال)'
      : inspector.districtId || 'المقاطعة التفتيشية';

  return (
    <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg shadow-emerald-900/15">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold text-emerald-100 border border-white/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {directorateText} - {districtText} (المفتش: {inspector.firstName} {inspector.lastName})
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            بوابة المفتش البيداغوجي: {inspector.firstName} {inspector.lastName}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl leading-relaxed">
            الإشراف البيداغوجي الشامل: الاطلاع على التوزيع الأسبوعي، التوزيع السنوي والمخطط البيداغوجي، المذكرات والتحضير، والعدد الكلي للتلاميذ وساعات العمل.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenBroadcastModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold rounded-2xl text-xs shadow-md transition-all cursor-pointer"
          >
            <Megaphone className="w-4 h-4 text-slate-950" />
            <span>📢 بث رسالة جماعية للمقاطعة</span>
          </button>
          <button
            onClick={onToggleActiveTab}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-blue-200" />
            <span>
              {activeTab === 'chat' ? '📋 العودة لبطاقات المتابعة' : '💬 المحادثة المباشرة مع الأستاذ'}
            </span>
          </button>
          <button
            onClick={onOpenVisitModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-emerald-800 hover:bg-emerald-50 font-bold rounded-2xl text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل زيارة تفقدية</span>
          </button>
        </div>
      </div>
    </div>
  );
};
