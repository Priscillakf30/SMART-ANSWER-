import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navigation } from './components/Navigation';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { AssignmentList } from './components/teacher/AssignmentList';
import { ClassManagement } from './components/teacher/ClassManagement';
import { StudentManagement } from './components/teacher/StudentManagement';
import { StudentAssignmentList } from './components/student/StudentAssignmentList';
import { Language } from './types';
import { CloudCheck, ShieldCheck, Heart } from 'lucide-react';

function AppContent() {
  const { isTeacher, isStudent } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>(isTeacher ? 'dashboard' : 'student-assignments');
  const [lang, setLang] = useState<Language>('zh');

  // If user switches role, adjust tab sensibly if needed
  React.useEffect(() => {
    if (isStudent && currentTab !== 'student-assignments') {
      setCurrentTab('student-assignments');
    } else if (isTeacher && currentTab === 'student-assignments') {
      setCurrentTab('dashboard');
    }
  }, [isTeacher, isStudent]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Top Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        lang={lang}
        onSelectLanguage={setLang}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {isTeacher ? (
          <>
            {currentTab === 'dashboard' && (
              <TeacherDashboard lang={lang} onNavigateTab={setCurrentTab} />
            )}
            {currentTab === 'assignments' && (
              <AssignmentList lang={lang} />
            )}
            {currentTab === 'classes' && (
              <ClassManagement lang={lang} />
            )}
            {currentTab === 'students' && (
              <StudentManagement lang={lang} />
            )}
          </>
        ) : (
          <StudentAssignmentList lang={lang} />
        )}
      </main>

      {/* System Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-slate-700 font-semibold text-xs tracking-wide">
            FKF | Copyright © 2026. All Rights Reserved.
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-600">
              <CloudCheck className="w-3.5 h-3.5" />
              <span>Cloud Firestore 已连接并同步</span>
            </span>
            <span className="flex items-center gap-1 text-sky-600">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>RBAC 权限已保护</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
