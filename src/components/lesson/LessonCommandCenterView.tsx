/**
 * SPEX - Lesson Command Center View
 * مركز قيادة الحصة البيداغوجية الذكي والتفاعلي لمرافقة أستاذ التربية البدنية والرياضية
 */

import React, { useState, useEffect } from 'react';
import {
  LessonSession,
  LessonSessionTiming,
  ClassRoom,
  LessonPlan,
  Student,
  DailyNotebookEntry,
  WeeklyScheduleSlot,
  LessonExecutionLog,
} from '../../types/spex';

import { useLessonCommandCenter } from '../../hooks/useLessonCommandCenter';
import { CommandCenterHeader } from './commandCenter/CommandCenterHeader';
import { CommandCenterPreSessionSetup } from './commandCenter/CommandCenterPreSessionSetup';
import { CommandCenterWhistleConsole } from './commandCenter/CommandCenterWhistleConsole';
import { CommandCenterActiveSession } from './commandCenter/CommandCenterActiveSession';
import { CommandCenterFieldTools } from './commandCenter/CommandCenterFieldTools';
import { CommandCenterModals } from './commandCenter/CommandCenterModals';

interface LessonCommandCenterViewProps {
  currentSession: LessonSession | null;
  timingSettings: LessonSessionTiming;
  teacherClasses: ClassRoom[];
  lessonPlans: LessonPlan[];
  students: Student[];
  weeklySchedule: WeeklyScheduleSlot[];
  onStartSession: (sessionData: Omit<LessonSession, 'id'>) => void;
  onUpdateSession: (updated: Partial<LessonSession>) => void;
  onEndSession: (executionLog?: LessonExecutionLog) => void;
  onUpdateTimingSettings: (settings: LessonSessionTiming) => void;
  onNavigateToLessonPlans: () => void;
  onAddNotebookEntry?: (entry: Omit<DailyNotebookEntry, 'id'>) => void;
}

export const LessonCommandCenterView: React.FC<LessonCommandCenterViewProps> = ({
  currentSession,
  timingSettings,
  teacherClasses,
  lessonPlans,
  students,
  weeklySchedule,
  onStartSession,
  onUpdateSession,
  onEndSession,
  onUpdateTimingSettings,
  onNavigateToLessonPlans,
  onAddNotebookEntry,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(teacherClasses[0]?.id || '');
  const [selectedLessonPlanId, setSelectedLessonPlanId] = useState<string>('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [lastExecutionLog, setLastExecutionLog] = useState<LessonExecutionLog | null>(null);
  const [isFullScreenMode, setIsFullScreenMode] = useState<boolean>(true);
  const [activeTabTool, setActiveTabTool] = useState<'guide' | 'attendance' | 'teams' | 'stopwatch'>('guide');

  // Custom hook for Stopwatch, Teams, Attendance & Contingency
  const {
    stopwatchTime,
    isStopwatchRunning,
    stopwatchLaps,
    handleToggleStopwatch,
    handleResetStopwatch,
    handleLapStopwatch,
    teamCount,
    generatedTeams,
    handleGenerateTeams,
    attendanceRecords,
    handleToggleAttendance,
    contingencyMode,
    setContingencyMode,
  } = useLessonCommandCenter(currentSession, students, selectedClassId);

  // Auto-find matching lesson plan
  useEffect(() => {
    if (selectedClassId) {
      const cls = teacherClasses.find((c) => c.id === selectedClassId);
      if (cls) {
        const matchingPlan = lessonPlans.find(
          (lp) => lp.levelName === cls.levelId || lp.className === cls.name || lp.teacherId === cls.teacherId
        );
        if (matchingPlan) {
          setSelectedLessonPlanId(matchingPlan.id);
        } else if (lessonPlans.length > 0) {
          setSelectedLessonPlanId(lessonPlans[0].id);
        }
      }
    }
  }, [selectedClassId, teacherClasses, lessonPlans]);

  const selectedPlan = lessonPlans.find((lp) => lp.id === selectedLessonPlanId) || lessonPlans[0] || null;

  const handleFinishAndSave = () => {
    if (!currentSession) return;
    const durationMinutes = Math.round((currentSession.totalElapsedSeconds || 0) / 60) || 45;

    const log: LessonExecutionLog = {
      id: `exec_${Date.now()}`,
      teacherId: currentSession.teacherId || 't_1',
      classId: currentSession.classId,
      className: currentSession.className,
      lessonPlanTitle: currentSession.sessionTitle || currentSession.educationalObjective || 'حصة بيداغوجية',
      date: new Date().toISOString().split('T')[0],
      actualStartTime: currentSession.startTime || '08:00',
      actualEndTime: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      totalDurationMinutes: durationMinutes,
      phaseDurations: {
        preparation: Math.round((currentSession.phaseDurations?.preparation || 600) / 60),
        situation1: Math.round((currentSession.phaseDurations?.situation1 || 1200) / 60),
        situation2: Math.round((currentSession.phaseDurations?.situation2 || 1200) / 60),
        final: Math.round((currentSession.phaseDurations?.final || 600) / 60),
      },
      delaysOrOverrunsMinutes: 0,
      completionStatus: 'منجزة في الوقت',
      attendanceData: {
        total: Object.keys(attendanceRecords).length || 25,
        present: Object.values(attendanceRecords).filter((v) => v === 'present').length,
        absent: Object.values(attendanceRecords).filter((v) => v === 'absent').length,
        exempt: Object.values(attendanceRecords).filter((v) => v === 'exempt').length,
      },
    };

    setLastExecutionLog(log);

    if (onAddNotebookEntry) {
      onAddNotebookEntry({
        teacherId: currentSession.teacherId || 't_1',
        classId: currentSession.classId,
        className: currentSession.className,
        levelName: 'التعليم الابتدائي / المتوسط',
        executionDate: new Date().toISOString().split('T')[0],
        timeSlot: '08:00 - 09:00',
        segmentTitle: 'المقطع البيداغوجي المعتمد',
        sessionTitle: currentSession.sessionTitle || 'حصة بيداغوجية',
        status: 'منجزة',
        note: `تم الإنجاز الميداني بنجاح بنسبة حضور عالية.`,
      });
    }

    onEndSession(log);
    setShowSummaryModal(true);
  };

  return (
    <div className="space-y-6 pb-12 dir-rtl">
      {/* Top Header */}
      <CommandCenterHeader
        timingSettings={timingSettings}
        onUpdateTimingSettings={onUpdateTimingSettings}
        onOpenSettingsModal={() => setShowSettingsModal(true)}
        isFullScreenMode={isFullScreenMode}
        onToggleFullScreen={() => setIsFullScreenMode((prev) => !prev)}
      />

      {/* Whistle Console */}
      <CommandCenterWhistleConsole
        soundEnabled={timingSettings.soundEnabled}
        vibrationEnabled={timingSettings.vibrationEnabled}
      />

      {/* Main Content Area: Setup or Active Session */}
      {!currentSession ? (
        <CommandCenterPreSessionSetup
          teacherClasses={teacherClasses}
          selectedClassId={selectedClassId}
          onSelectClassId={setSelectedClassId}
          lessonPlans={lessonPlans}
          selectedLessonPlanId={selectedLessonPlanId}
          onSelectLessonPlanId={setSelectedLessonPlanId}
          contingencyMode={contingencyMode}
          onSelectContingencyMode={setContingencyMode}
          onStartSession={onStartSession}
          onNavigateToLessonPlans={onNavigateToLessonPlans}
        />
      ) : (
        <CommandCenterActiveSession
          currentSession={currentSession}
          timingSettings={timingSettings}
          onUpdateSession={onUpdateSession}
          onEndSession={handleFinishAndSave}
        />
      )}

      {/* Field Tools Tabs: Guide, Attendance, Teams, Field Stopwatch */}
      <CommandCenterFieldTools
        activeTabTool={activeTabTool}
        onSelectTabTool={setActiveTabTool}
        selectedPlan={selectedPlan}
        students={students}
        selectedClassId={selectedClassId}
        attendanceRecords={attendanceRecords}
        onToggleAttendance={handleToggleAttendance}
        teamCount={teamCount}
        generatedTeams={generatedTeams}
        onGenerateTeams={handleGenerateTeams}
        stopwatchTime={stopwatchTime}
        isStopwatchRunning={isStopwatchRunning}
        stopwatchLaps={stopwatchLaps}
        onToggleStopwatch={handleToggleStopwatch}
        onResetStopwatch={handleResetStopwatch}
        onLapStopwatch={handleLapStopwatch}
      />

      {/* Modals Container */}
      <CommandCenterModals
        showSettingsModal={showSettingsModal}
        onCloseSettingsModal={() => setShowSettingsModal(false)}
        timingSettings={timingSettings}
        onUpdateTimingSettings={onUpdateTimingSettings}
        showSummaryModal={showSummaryModal}
        onCloseSummaryModal={() => setShowSummaryModal(false)}
        lastExecutionLog={lastExecutionLog}
      />
    </div>
  );
};
