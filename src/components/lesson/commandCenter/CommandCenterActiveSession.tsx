import React, { useEffect } from 'react';
import { Play, Pause, SkipForward, CheckCircle2, Clock, Sparkles } from 'lucide-react';
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
  const currentPhase: LessonSession['currentPhase'] = currentSession.currentPhase || 'preparation';
  const isPaused = currentSession.isPaused || false;
  
  // Calculate total session time & phase duration
  const prepMins = timingSettings.preparationMinutes || 10;
  const sit1Mins = timingSettings.situation1Minutes || 20;
  const sit2Mins = timingSettings.situation2Minutes || 20;
  const finalMins = timingSettings.finalMinutes || 10;
  const totalMins = prepMins + sit1Mins + sit2Mins + finalMins;

  const currentPhaseMaxMins =
    currentPhase === 'preparation'
      ? prepMins
      : currentPhase === 'situation1'
      ? sit1Mins
      : currentPhase === 'situation2'
      ? sit2Mins
      : finalMins;

  const currentPhaseMaxSecs = currentPhaseMaxMins * 60;
  const remainingSecs = typeof currentSession.phaseRemainingSeconds === 'number'
    ? currentSession.phaseRemainingSeconds
    : currentPhaseMaxSecs;
  const totalElapsedSecs = currentSession.totalElapsedSeconds || 0;

  // Interval timer for active running session
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (!isPaused && currentSession.status !== 'completed') {
      interval = setInterval(() => {
        if (remainingSecs <= 1) {
          // Play whistle sound on phase change
          playWhistleSound('long', timingSettings.soundEnabled);
          triggerVibration(timingSettings.vibrationEnabled);

          // Auto transition to next phase
          if (currentPhase === 'preparation') {
            onUpdateSession({
              currentPhase: 'situation1',
              phaseRemainingSeconds: sit1Mins * 60,
              totalElapsedSeconds: totalElapsedSecs + 1,
            });
          } else if (currentPhase === 'situation1') {
            onUpdateSession({
              currentPhase: 'situation2',
              phaseRemainingSeconds: sit2Mins * 60,
              totalElapsedSeconds: totalElapsedSecs + 1,
            });
          } else if (currentPhase === 'situation2') {
            onUpdateSession({
              currentPhase: 'final',
              phaseRemainingSeconds: finalMins * 60,
              totalElapsedSeconds: totalElapsedSecs + 1,
            });
          } else {
            // Reached end of final phase
            onUpdateSession({
              phaseRemainingSeconds: 0,
              totalElapsedSeconds: totalElapsedSecs + 1,
              isPaused: true,
              status: 'completed',
            });
          }
        } else {
          onUpdateSession({
            phaseRemainingSeconds: remainingSecs - 1,
            totalElapsedSeconds: totalElapsedSecs + 1,
          });
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPaused, currentPhase, remainingSecs, totalElapsedSecs, currentSession.status, timingSettings]);

  const formatMinutesSeconds = (secs: number) => {
    const m = Math.floor(Math.max(0, secs) / 60);
    const s = Math.max(0, secs) % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleNextPhase = () => {
    playWhistleSound('long', timingSettings.soundEnabled);
    triggerVibration(timingSettings.vibrationEnabled);

    if (currentPhase === 'preparation') {
      onUpdateSession({ currentPhase: 'situation1', phaseRemainingSeconds: sit1Mins * 60 });
    } else if (currentPhase === 'situation1') {
      onUpdateSession({ currentPhase: 'situation2', phaseRemainingSeconds: sit2Mins * 60 });
    } else if (currentPhase === 'situation2') {
      onUpdateSession({ currentPhase: 'final', phaseRemainingSeconds: finalMins * 60 });
    } else {
      onEndSession();
    }
  };

  const getPhaseNameInArabic = (phase: LessonSession['currentPhase']) => {
    switch (phase) {
      case 'preparation':
        return 'المرحلة التحضيرية (الإحماء وتجهيز الصف)';
      case 'situation1':
        return 'الوضعية التعلمية الأولى (بناء التعلمات)';
      case 'situation2':
        return 'الوضعية التعلمية الثانية (التنافس والتطبيق)';
      case 'final':
        return 'المرحلة الختامية (التهدئة والتقويم)';
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
          <h3 className="text-lg font-black text-white mt-1">
            {currentSession.sessionTitle || currentSession.educationalObjective || 'حصة تربية بدنية ورياضية'}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-xl border border-amber-500/30">
            الوقت المنقضي: {formatMinutesSeconds(totalElapsedSecs)} / {totalMins} دقيقة
          </span>
        </div>
      </div>

      {/* Main 4 Phases Display Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center">
        {/* 1. Preparation */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            currentPhase === 'preparation'
              ? 'bg-amber-500/25 border-amber-500 text-amber-200 shadow-lg scale-102 ring-2 ring-amber-500/40'
              : 'bg-slate-800/50 border-slate-700/50 text-slate-400 opacity-70'
          }`}
        >
          <span className="text-[10px] font-black block">1. المرحلة التحضيرية</span>
          <span className="text-xs font-extrabold block mt-0.5">{prepMins} دقائق</span>
        </div>

        {/* 2. Situation 1 */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            currentPhase === 'situation1'
              ? 'bg-blue-500/25 border-blue-500 text-blue-200 shadow-lg scale-102 ring-2 ring-blue-500/40'
              : 'bg-slate-800/50 border-slate-700/50 text-slate-400 opacity-70'
          }`}
        >
          <span className="text-[10px] font-black block">2. الوضعية التعلمية 1</span>
          <span className="text-xs font-extrabold block mt-0.5">{sit1Mins} دقيقة</span>
        </div>

        {/* 3. Situation 2 */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            currentPhase === 'situation2'
              ? 'bg-indigo-500/25 border-indigo-500 text-indigo-200 shadow-lg scale-102 ring-2 ring-indigo-500/40'
              : 'bg-slate-800/50 border-slate-700/50 text-slate-400 opacity-70'
          }`}
        >
          <span className="text-[10px] font-black block">3. الوضعية التعلمية 2</span>
          <span className="text-xs font-extrabold block mt-0.5">{sit2Mins} دقيقة</span>
        </div>

        {/* 4. Final */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
            currentPhase === 'final'
              ? 'bg-emerald-500/25 border-emerald-500 text-emerald-200 shadow-lg scale-102 ring-2 ring-emerald-500/40'
              : 'bg-slate-800/50 border-slate-700/50 text-slate-400 opacity-70'
          }`}
        >
          <span className="text-[10px] font-black block">4. المرحلة الختامية</span>
          <span className="text-xs font-extrabold block mt-0.5">{finalMins} دقائق</span>
        </div>
      </div>

      {/* Timer Counter Display */}
      <div className="bg-slate-950/90 p-6 rounded-3xl border border-slate-800 text-center space-y-2">
        <div className="text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>المتبقي في {getPhaseNameInArabic(currentPhase)}:</span>
        </div>
        <div className="text-5xl sm:text-6xl font-black text-emerald-400 tracking-wider font-mono dir-ltr">
          {formatMinutesSeconds(remainingSecs)}
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

