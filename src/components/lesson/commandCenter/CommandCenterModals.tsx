import React from 'react';
import { X, Settings, CheckCircle2 } from 'lucide-react';
import { LessonSessionTiming, LessonExecutionLog } from '../../../types/spex';

interface CommandCenterModalsProps {
  showSettingsModal: boolean;
  onCloseSettingsModal: () => void;
  timingSettings: LessonSessionTiming;
  onUpdateTimingSettings: (settings: LessonSessionTiming) => void;
  showSummaryModal: boolean;
  onCloseSummaryModal: () => void;
  lastExecutionLog: LessonExecutionLog | null;
}

export const CommandCenterModals: React.FC<CommandCenterModalsProps> = ({
  showSettingsModal,
  onCloseSettingsModal,
  timingSettings,
  onUpdateTimingSettings,
  showSummaryModal,
  onCloseSummaryModal,
  lastExecutionLog,
}) => {
  return (
    <>
      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                <span>إعدادات التوقيت والتنبيهات الميدانية</span>
              </h3>
              <button onClick={onCloseSettingsModal} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">إجمالي زمن الحصة (دقائق):</label>
                <input
                  type="number"
                  value={timingSettings.totalDurationMinutes}
                  onChange={(e) =>
                    onUpdateTimingSettings({
                      ...timingSettings,
                      totalDurationMinutes: parseInt(e.target.value) || 45,
                    })
                  }
                  className="w-full p-2.5 border border-slate-200 rounded-xl outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[10px]">الإحماء (د):</label>
                  <input
                    type="number"
                    value={timingSettings.warmupMinutes}
                    onChange={(e) =>
                      onUpdateTimingSettings({
                        ...timingSettings,
                        warmupMinutes: parseInt(e.target.value) || 10,
                      })
                    }
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[10px]">الرئيسية (د):</label>
                  <input
                    type="number"
                    value={timingSettings.mainPhaseMinutes}
                    onChange={(e) =>
                      onUpdateTimingSettings({
                        ...timingSettings,
                        mainPhaseMinutes: parseInt(e.target.value) || 25,
                      })
                    }
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[10px]">التهدئة (د):</label>
                  <input
                    type="number"
                    value={timingSettings.cooldownMinutes}
                    onChange={(e) =>
                      onUpdateTimingSettings({
                        ...timingSettings,
                        cooldownMinutes: parseInt(e.target.value) || 10,
                      })
                    }
                    className="w-full p-2 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={timingSettings.soundEnabled}
                    onChange={(e) =>
                      onUpdateTimingSettings({ ...timingSettings, soundEnabled: e.target.checked })
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>تفعيل المؤثرات الصوتية وزبرة الصفارة</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={timingSettings.vibrationEnabled}
                    onChange={(e) =>
                      onUpdateTimingSettings({ ...timingSettings, vibrationEnabled: e.target.checked })
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>تفعيل اهتزاز الهاتف عند تغيير المراحل</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onCloseSettingsModal}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs cursor-pointer"
              >
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execution Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in zoom-in-95" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>ملخص تنفيذ الحصة البيداغوجية</span>
              </h3>
              <button onClick={onCloseSummaryModal} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-emerald-50 text-emerald-950 rounded-2xl border border-emerald-200/80 space-y-1">
                <span className="font-extrabold block text-sm">تم إنهاء الحصة الميدانية بنجاح!</span>
                <p className="text-emerald-800">
                  تم توثيق الحصة تلقائياً وإضافتها لدفتر اليوميات التربوي للمؤسسة.
                </p>
              </div>

              {lastExecutionLog && (
                <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">القسم:</span>
                    <span className="font-extrabold text-slate-900">{lastExecutionLog.className}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">عنوان الحصة:</span>
                    <span className="font-extrabold text-slate-900">{lastExecutionLog.lessonPlanTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">زمن التنفيذ الفعلي:</span>
                    <span className="font-black text-emerald-700">{lastExecutionLog.totalDurationMinutes} دقيقة</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onCloseSummaryModal}
                className="px-6 py-2.5 bg-slate-900 text-white font-extrabold rounded-xl text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
