import React, { useEffect } from 'react';
import { Play, Pause, SkipForward, RotateCcw, CheckCircle2, Clock } from 'lucide-react';
import { LessonSession, LessonSessionTiming } from '../../../types/spex';
import { playWhistleSound, triggerVibration } from '../../../services/lessonCommandCenter.service';

interface CommandCenterActiveSessionProps {
  currentSession: LessonSession;
  timingSettings: LessonSessionTiming;
  onUpdateSession: (updated: Partial<LessonSession>) => void;
  onEndSession: () => void;
}

export const CommandCenterActiveSession: React.FC<CommandCenterActiveSessionProps> = ({
  currentSession,
  timingSettings,
  onUpdateSession,
  onEndSession,
}) => {
  const currentPhase = currentSession.currentPhase || 'warmup';
  const isPaused = currentSession.isPaused || false;
  const phaseElapsedTime = currentSession.phaseElapsedTime || 0;
  const totalElapsedTime = currentSession.totalElapsedTime || 0;

  // Phase max duration calculation
  const phaseMaxMinutes =
    currentPhase === 'warmup'
      ? timingSettings.warmupMinutes || 10
      : currentPhase === 'main'
      ? timingSettings.mainPhaseMinutes || 25
      : timingSettings.cooldownMinutes || 10;

  const phaseMaxSeconds = phaseMaxMinutes * 60;
  const remainingPhaseSeconds = Math.max(0, phaseMaxSeconds - phaseElapsedTime);

  // Interval timer for running session
  useEffect(() => {
    let interval: any = null;
    if (!isPaused) {
      interval = setInterval(() => {
        const nextPhaseElapsed = phaseElapsedTime + 1;
        const nextTotalElapsed = totalElapsedTime + 1;

        if (nextPhaseElapsed >= phaseMaxSeconds) {
          // Auto transition to next phase
          if (timingSettings.whistleAtPhaseChange) {
            playWhistleSound('long', timingSettings.soundEnabled);
            triggerVibration(timingSettings.vibrationEnabled);
          }

          if (currentPhase === 'warmup') {
            onUpdateSession({
              currentPhase: 'main',
              phaseElapsedTime: 0,
              totalElapsedTime: nextTotalElapsed,
            });
          } else if (currentPhase === 'main') {
            onUpdateSession({
              currentPhase: 'cooldown',
              phaseElapsedTime: 0,
              totalElapsedTime: nextTotalElapsed,
            });
          } else {
            // Completed full lesson duration
            onUpdateSession({
              phaseElapsedTime: nextPhaseElapsed,
              totalElapsedTime: nextTotalElapsed,
              isPaused: true,
            });
          }
        } else {
          onUpdateSession({
            phaseElapsedTime: nextPhaseElapsed,
            totalElapsedTime: nextTotalElapsed,
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPaused, phaseElapsedTime, totalElapsedTime, currentPhase, phaseMaxSeconds]);

  const formatMinutesSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleNextPhase = () => {
    if (timingSettings.whistleAtPhaseChange) {
      playWhistleSound('long', timingSettings.soundEnabled);
      triggerVibration(timingSettings.vibrationEnabled);
    }
    if (currentPhase === 'warmup') {
      onUpdateSession({ currentPhase: 'main', phaseElapsedTime: 0 });
    } else if (currentPhase === 'main') {
      onUpdateSession({ currentPhase: 'cooldown', phaseElapsedTime: 0 });
    } else {
      onEndSession();
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-6 rounded-3xl shadow-2xl space-y-5 border border-slate-700/80">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
        <div>
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            ● الجلسة الميدانية جارية مع {currentSession.className}
          </span>
          <h3 className="text-lg font-black text-white mt-1">{currentSession.lessonTitle}</h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-xl border border-amber-500/30">
            الوقت الإجمالي: {formatMinutesSeconds(totalElapsedTime)} / {timingSettings.totalDurationMinutes}د
          </span>
        </div>
      </div>

      {/* Main Big Phase Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        {/* Warmup Phase Card */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            currentPhase === 'warmup'
              ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-lg scale-105'
              : 'bg-slate-800/50 border-slate-700/50 text-slate-400 opacity-60'
          }`}
        >
          <span className="text-[10px] font-black block">1. التمهيدية / الإحماء</span>
          <span className="text-sm font-bold block mt-0.5">{timingSettings.warmupMinutes} دقائق</span>
        </div>

        {/* Main Phase Card */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            currentPhase === 'main'
              ? 'bg-blue-500/20 border-blue-500 text-blue-200 shadow-lg scale-105'
              : 'bg-slate-800/50 border-slate-700/50 text-slate-400 opacity-60'
          }`}
        >
          <span className="text-[10px] font-black block">2. الرئيسية / التعلم والتطبيق</span>
          <span className="text-sm font-bold block mt-0.5">{timingSettings.mainPhaseMinutes} دقيقة</span>
        </div>

        {/* Cooldown Phase Card */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            currentPhase === 'cooldown'
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-lg scale-105'
              : 'bg-slate-800/50 border-slate-700/50 text-slate-400 opacity-60'
          }`}
        >
          <span className="text-[10px] font-black block">3. الختامية / التهدئة والتقويم</span>
          <span className="text-sm font-bold block mt-0.5">{timingSettings.cooldownMinutes} دقائق</span>
        </div>
      </div>

      {/* Timer Counter Display */}
      <div className="bg-slate-950/80 p-6 rounded-3xl border border-slate-800 text-center space-y-2">
        <div className="text-xs font-bold text-slate-400 flex items-center justify-center gap-1.5">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>المتبقي في المرحلة الحالية ({currentPhase === 'warmup' ? 'الإحماء' : currentPhase === 'main' ? 'التطبيق الرئيسي' : 'التهدئة'}):</span>
        </div>
        <div className="text-5xl sm:text-6xl font-black text-emerald-400 tracking-wider font-mono dir-ltr">
          {formatMinutesSeconds(remainingPhaseSeconds)}
        </div>
      </div>

      {/* Control Buttons Bar */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={() => onUpdateSession({ isPaused: !isPaused })}
          className={`px-6 py-3.5 rounded-2xl font-black text-xs shadow-lg transition-all cursor-pointer flex items-center gap-2 ${
            isPaused
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-amber-600 hover:bg-amber-500 text-white'
          }`}
        >
          {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
          <span>{isPaused ? 'استئناف التوقيت' : 'إيقاف مؤقت'}</span>
        </button>

        <button
          onClick={handleNextPhase}
          className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-2xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
        >
          <SkipForward className="w-5 h-5" />
          <span>الانتقال للمرحلة التالية</span>
        </button>

        <button
          onClick={onEndSession}
          className="px-6 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-2xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>إنهاء الحصة واعتماد التقرير</span>
        </button>
      </div>
    </div>
  );
};
