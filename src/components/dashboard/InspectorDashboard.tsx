/**
 * SPEX - Inspector Portal / Dashboard Component
 * بوابة المفتش البيداغوجي: متابعة الأساتذة، التوزيع الأسبوعي، المخطط البيداغوجي، المذكرات، والتوجيهات الرسمية.
 */

import React, { useState } from 'react';
import {
  User,
  InspectorNote,
  InspectionVisit,
  DistrictBroadcast,
  DirectChatMessage,
  ClassRoom,
  Student,
  WeeklyScheduleSlot,
  LessonPlan,
  DailyNotebookEntry,
} from '../../types/spex';

import { useInspectorDashboardStats } from '../../hooks/useInspectorDashboardStats';
import { useTeacher } from '../../hooks/useTeacher';
import { useLessonPlans } from '../../hooks/useLessonPlans';
import { useReports } from '../../hooks/useReports';

import { InspectorHeroHeader } from './inspector/InspectorHeroHeader';
import { InspectorKpiGrid } from './inspector/InspectorKpiGrid';
import { InspectorActivityFeed } from './inspector/InspectorActivityFeed';
import { InspectorDistrictChart } from './inspector/InspectorDistrictChart';
import { InspectorTeacherList } from './inspector/InspectorTeacherList';
import { InspectorPedagogicalProfile } from './inspector/InspectorPedagogicalProfile';
import { InspectorDirectChat } from './inspector/InspectorDirectChat';
import { InspectorModals } from './inspector/InspectorModals';

interface InspectorDashboardProps {
  inspector: User;
  teachers: User[];
  notes: InspectorNote[];
  visits: InspectionVisit[];
  broadcasts?: DistrictBroadcast[];
  directMessages?: DirectChatMessage[];
  classes?: ClassRoom[];
  students?: Student[];
  weeklySchedule?: WeeklyScheduleSlot[];
  lessonPlans?: LessonPlan[];
  dailyNotebook?: DailyNotebookEntry[];
  onAddNote: (note: Partial<InspectorNote>) => void;
  onAddVisit: (visit: Partial<InspectionVisit>) => void;
  onAddBroadcast?: (broadcast: Partial<DistrictBroadcast>) => void;
  onAddDirectMessage?: (msg: { receiverId: string; receiverName: string; message: string }) => void;
}

export const InspectorDashboard: React.FC<InspectorDashboardProps> = ({
  inspector,
  teachers,
  notes,
  visits,
  broadcasts = [],
  directMessages = [],
  classes = [],
  students = [],
  weeklySchedule = [],
  lessonPlans = [],
  dailyNotebook = [],
  onAddNote,
  onAddVisit,
  onAddBroadcast,
  onAddDirectMessage,
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'overview' | 'chat'>('overview');
  const [teacherSubTab, setTeacherSubTab] = useState<
    'annual_plan' | 'schedule' | 'lesson_plans' | 'students' | 'visits'
  >('annual_plan');
  const [selectedInspectorLevelId, setSelectedInspectorLevelId] = useState<string>('lvl_p1');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [selectedLessonPlanModal, setSelectedLessonPlanModal] = useState<LessonPlan | null>(null);

  // Chat local state fallback
  const [localChatMessages, setLocalChatMessages] = useState<DirectChatMessage[]>([]);

  // 1. Dashboard Global Stats
  const globalStats = useInspectorDashboardStats(
    teachers,
    dailyNotebook,
    notes,
    visits,
    lessonPlans
  );

  // 2. Selected Teacher Details
  const {
    selectedTeacher,
    teacherClasses,
    totalStudentsTaught,
    maleCount,
    femaleCount,
    weeklyHoursCount,
  } = useTeacher(teachers, selectedTeacherId, classes, students, weeklySchedule);

  // 3. Lesson Plans for selected teacher
  const { filteredTeacherPlans } = useLessonPlans(lessonPlans, selectedTeacher, teachers);

  // 4. Reports for selected teacher
  const { teacherVisits, teacherNotes } = useReports(visits, notes);

  // Handlers
  const handleSelectTeacher = (t: User) => {
    setSelectedTeacherId(t.id);
  };

  const handleSendBroadcast = (title: string, content: string) => {
    if (onAddBroadcast) {
      onAddBroadcast({
        id: `bc_${Date.now()}`,
        inspectorId: inspector.id,
        inspectorName: `${inspector.firstName} ${inspector.lastName}`,
        title,
        content,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleSendDirectMessage = (text: string) => {
    const newMsg: DirectChatMessage = {
      id: `chat_${Date.now()}`,
      senderId: inspector.id,
      senderName: `المفتش ${inspector.firstName} ${inspector.lastName}`,
      senderRole: 'inspector',
      receiverId: selectedTeacher.id,
      receiverName: `${selectedTeacher.firstName} ${selectedTeacher.lastName}`,
      districtId: inspector.districtId || 'dist_1',
      message: text,
      createdAt: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
    };

    setLocalChatMessages((prev) => [...prev, newMsg]);

    if (onAddDirectMessage) {
      onAddDirectMessage({
        receiverId: selectedTeacher.id,
        receiverName: `${selectedTeacher.firstName} ${selectedTeacher.lastName}`,
        message: text,
      });
    }
  };

  return (
    <div className="space-y-6 pb-12 dir-rtl">
      {/* Hero Header */}
      <InspectorHeroHeader
        inspector={inspector}
        activeTab={activeTab}
        onToggleActiveTab={() => setActiveTab(activeTab === 'chat' ? 'overview' : 'chat')}
        onOpenBroadcastModal={() => setShowBroadcastModal(true)}
        onOpenVisitModal={() => setShowVisitModal(true)}
      />

      {/* KPI Stats Grid */}
      <InspectorKpiGrid
        teachersCount={teachers.length}
        institutionsCount={globalStats.institutionsCount}
        completionRate={globalStats.completionRate}
        inactiveTeachersCount={globalStats.inactiveTeachers.length}
        lateReportsCount={globalStats.lateReportTeachers.length}
        totalStudentsTaught={totalStudentsTaught}
        weeklyHoursCount={weeklyHoursCount}
      />

      {/* Active Tab View */}
      {activeTab === 'overview' ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Teacher Selection Grid */}
          <InspectorTeacherList
            teachers={teachers}
            selectedTeacher={selectedTeacher}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onSelectTeacher={handleSelectTeacher}
          />

          {/* Selected Teacher Full Pedagogical Profile */}
          <InspectorPedagogicalProfile
            selectedTeacher={selectedTeacher}
            teacherClasses={teacherClasses}
            totalStudentsTaught={totalStudentsTaught}
            maleCount={maleCount}
            femaleCount={femaleCount}
            weeklyHoursCount={weeklyHoursCount}
            teacherSubTab={teacherSubTab}
            onSetTeacherSubTab={setTeacherSubTab}
            selectedInspectorLevelId={selectedInspectorLevelId}
            onSetSelectedInspectorLevelId={setSelectedInspectorLevelId}
            teacherLessonPlans={filteredTeacherPlans}
            teacherNotebook={dailyNotebook.filter((nb) => nb.teacherId === selectedTeacher.id)}
            teacherScheduleSlots={weeklySchedule.filter(
              (s) => !s.teacherId || s.teacherId === selectedTeacher.id
            )}
            visits={visits}
            notes={notes}
            onOpenVisitModal={() => setShowVisitModal(true)}
            onOpenNoteModal={() => setShowNoteModal(true)}
            onSelectLessonPlanModal={setSelectedLessonPlanModal}
          />

          {/* Activity Feed & Alerts + District Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InspectorActivityFeed
              recentActivities={globalStats.recentActivities}
              lateReportTeachers={globalStats.lateReportTeachers}
              inactiveTeachers={globalStats.inactiveTeachers}
              onSelectTeacher={handleSelectTeacher}
              onOpenNoteModalForTeacher={(t) => {
                setSelectedTeacherId(t.id);
                setShowNoteModal(true);
              }}
            />
            <InspectorDistrictChart chartData={globalStats.institutionChartData} />
          </div>
        </div>
      ) : (
        /* Chat View */
        <div className="animate-in fade-in duration-200">
          <InspectorDirectChat
            inspector={inspector}
            selectedTeacher={selectedTeacher}
            chatMessages={localChatMessages}
            onSendMessage={handleSendDirectMessage}
          />
        </div>
      )}

      {/* Modals Container */}
      <InspectorModals
        selectedLessonPlanModal={selectedLessonPlanModal}
        onCloseLessonPlanModal={() => setSelectedLessonPlanModal(null)}
        showNoteModal={showNoteModal}
        onCloseNoteModal={() => setShowNoteModal(false)}
        selectedTeacher={selectedTeacher}
        onAddNote={(note) => onAddNote(note)}
        showVisitModal={showVisitModal}
        onCloseVisitModal={() => setShowVisitModal(false)}
        onAddVisit={(visit) => onAddVisit(visit)}
        showBroadcastModal={showBroadcastModal}
        onCloseBroadcastModal={() => setShowBroadcastModal(false)}
        onSendBroadcast={handleSendBroadcast}
      />
    </div>
  );
};
