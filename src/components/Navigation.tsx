import React, { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  FileEdit,
  CheckCircle,
  Globe,
  LogOut,
  LogIn,
  UserCheck,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  School
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Language, UserRole } from '../types';
import { translations } from '../utils/translations';
import { HandwritingPadModal } from './student/HandwritingPadModal';
import { AppLogo } from './common/AppLogo';

interface NavigationProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  lang: Language;
  onSelectLanguage: (lang: Language) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  lang,
  onSelectLanguage
}) => {
  const { currentUser, isTeacher, isStudent, isAdmin, signOut, signInWithGoogle, switchPersona } = useAuth();
  const t = translations[lang];

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showHandwritingPad, setShowHandwritingPad] = useState(false);

  const teacherNavItems = [
    { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { id: 'assignments', label: t.nav.assignments, icon: BookOpen },
    { id: 'classes', label: t.nav.classes, icon: Users },
    { id: 'students', label: t.nav.students, icon: GraduationCap }
  ];

  const studentNavItems = [
    { id: 'student-assignments', label: t.nav.myAssignments, icon: BookOpen }
  ];

  const navItems = isTeacher ? teacherNavItems : studentNavItems;

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        {/* Top Announcement Bar */}
        <div className="bg-slate-900 text-slate-300 text-[11px] py-1 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">Smart Answer</span>
            <span className="hidden sm:inline text-slate-400">• 马来西亚华小在线答题与智能批改平台 (SJKC Online Platform)</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Google Account / Sign-in */}
            <button
              onClick={() => setShowRoleModal(true)}
              className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 font-bold transition cursor-pointer"
            >
              {firebaseUser ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Google: {firebaseUser.displayName || firebaseUser.email}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>使用 Google 登录</span>
                </>
              )}
            </button>

            {/* Language Picker */}
            <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
              <Globe className="w-3 h-3 text-slate-400" />
              <button
                onClick={() => onSelectLanguage('zh')}
                className={`hover:text-white transition px-1 ${lang === 'zh' ? 'text-sky-400 font-bold' : ''}`}
              >
                中
              </button>
              <span className="text-slate-600">/</span>
              <button
                onClick={() => onSelectLanguage('ms')}
                className={`hover:text-white transition px-1 ${lang === 'ms' ? 'text-sky-400 font-bold' : ''}`}
              >
                BM
              </button>
              <span className="text-slate-600">/</span>
              <button
                onClick={() => onSelectLanguage('en')}
                className={`hover:text-white transition px-1 ${lang === 'en' ? 'text-sky-400 font-bold' : ''}`}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <AppLogo size="md" />

          {/* Desktop Navigation Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Quick Handwriting Pad Launcher */}
            <button
              onClick={() => setShowHandwritingPad(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition ml-2 shadow-xs"
              title="打开数码手写作答板 (触控/鼠标)"
            >
              <span>✍️</span>
              <span>手写作答板</span>
            </button>
          </nav>

          {/* User Profile & Role badge */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-900">
                {currentUser?.displayName || '访客'}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isTeacher ? 'bg-indigo-500' : 'bg-emerald-500'
                }`} />
                <span>{isTeacher ? '教师 (Guru)' : '学生 (Murid)'}</span>
              </div>
            </div>

            <button
              onClick={signOut}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Menu Hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2">
            <div className="p-3 bg-slate-50 rounded-xl mb-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">{currentUser?.displayName}</div>
                <div className="text-[11px] text-slate-400">
                  {isTeacher ? '教师账号' : '学生账号'} • {currentUser?.studentId || 'SJKC'}
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowRoleModal(true);
                }}
                className="text-xs text-sky-600 font-bold"
              >
                切换
              </button>
            </div>

            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <button
              onClick={() => {
                setShowHandwritingPad(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition"
            >
              <span>✍️</span>
              <span>手写作答板 (触控/鼠标)</span>
            </button>
          </div>
        )}
      </header>

      {/* Role / Persona Switching Modal for Fast Testing */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>切换用户身份与角色</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  方便在教师布置/批改与学生作答之间无缝测试与评估
                </p>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 mb-6">
              {/* Teacher Tan */}
              <button
                onClick={() => {
                  switchPersona('teacher');
                  onSelectTab('dashboard');
                  setShowRoleModal(false);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                  isTeacher
                    ? 'border-indigo-500 bg-indigo-50/60 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {DEMO_PERSONAS.teacher.displayName}
                  </div>
                  <div className="text-xs text-indigo-700 font-medium mt-0.5">
                    教师身份 • 布置作业、管理班级、数字红笔批改
                  </div>
                </div>
                {isTeacher && <CheckCircle className="w-5 h-5 text-indigo-600" />}
              </button>

              {/* Student 1 (Xiao Ming) */}
              <button
                onClick={() => {
                  switchPersona('student', undefined, 'student-01');
                  onSelectTab('student-assignments');
                  setShowRoleModal(false);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                  isStudent && currentUser?.uid === 'student-01'
                    ? 'border-sky-500 bg-sky-50/60 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {DEMO_PERSONAS.student1.displayName}
                  </div>
                  <div className="text-xs text-sky-700 font-medium mt-0.5">
                    学生身份 • 3红班 • 手写/打字作答练习卷、查看成绩
                  </div>
                </div>
                {isStudent && currentUser?.uid === 'student-01' && (
                  <CheckCircle className="w-5 h-5 text-sky-600" />
                )}
              </button>

              {/* Student 2 (Li Mei) */}
              <button
                onClick={() => {
                  switchPersona('student', undefined, 'student-02');
                  onSelectTab('student-assignments');
                  setShowRoleModal(false);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                  isStudent && currentUser?.uid === 'student-02'
                    ? 'border-sky-500 bg-sky-50/60 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {DEMO_PERSONAS.student2.displayName}
                  </div>
                  <div className="text-xs text-sky-700 font-medium mt-0.5">
                    学生身份 • 3红班 • 另一位学生视角
                  </div>
                </div>
                {isStudent && currentUser?.uid === 'student-02' && (
                  <CheckCircle className="w-5 h-5 text-sky-600" />
                )}
              </button>
            </div>

            {/* Google Sign In option */}
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={async () => {
                  await signInWithGoogle();
                  setShowRoleModal(false);
                }}
                className="w-full flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-50 py-2.5 rounded-xl text-xs font-semibold text-slate-700 transition"
              >
                <LogIn className="w-4 h-4 text-sky-600" />
                <span>使用 Google 真实账号登录 (Firebase Auth)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Handwriting Pad Modal */}
      <HandwritingPadModal
        isOpen={showHandwritingPad}
        onClose={() => setShowHandwritingPad(false)}
      />
    </>
  );
};
