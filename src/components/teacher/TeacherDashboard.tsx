import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Users,
  Award,
  ChevronRight,
  Calendar,
  Layers,
  ArrowRight,
  Loader2,
  Trash2,
  Share2
} from 'lucide-react';
import {
  Assignment,
  Submission,
  SchoolClass,
  UserProfile,
  Language
} from '../../types';
import { dbService } from '../../services/dbService';
import { useAuth } from '../../contexts/AuthContext';
import { translations } from '../../utils/translations';
import { AssignmentCreateModal } from './AssignmentCreateModal';
import { SubmissionsList } from './SubmissionsList';

interface TeacherDashboardProps {
  lang: Language;
  onNavigateTab: (tab: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  lang,
  onNavigateTab
}) => {
  const { currentUser } = useAuth();
  const t = translations[lang];

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeAssignmentForSubmissions, setActiveAssignmentForSubmissions] = useState<Assignment | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [asgList, subList, clsList, stuList] = await Promise.all([
        dbService.getAssignments(),
        dbService.getSubmissions(),
        dbService.getClasses(),
        dbService.getStudentsByClass()
      ]);
      setAssignments(asgList);
      setSubmissions(subList);
      setClasses(clsList);
      setStudents(stuList);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute live statistics directly from Firestore records
  const totalAssignments = assignments.length;
  const draftAssignments = assignments.filter(a => a.status === 'draft').length;
  const publishedAssignments = assignments.filter(a => a.status === 'published').length;

  const totalSubmissions = submissions.filter(s => s.status === 'submitted' || s.status === 'in_progress').length;
  const pendingMarking = submissions.filter(s => s.status === 'submitted' && s.markingStatus !== 'marked').length;
  const markingInProgress = submissions.filter(s => s.markingStatus === 'in_progress').length;
  const markedSubmissions = submissions.filter(s => s.markingStatus === 'marked').length;

  // Unsubmitted calculation: total expected submissions across active classes minus actual submitted
  const unsubmittedCount = Math.max(0, students.length * publishedAssignments - totalSubmissions);

  const recentAssignments = [...assignments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const upcomingDeadlines = assignments
    .filter(a => a.status === 'published' && new Date(a.deadline).getTime() > Date.now())
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 4);

  const handleDeleteAssignment = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定要删除该作业吗？')) {
      await dbService.deleteAssignment(id);
      loadDashboardData();
    }
  };

  if (activeAssignmentForSubmissions) {
    return (
      <SubmissionsList
        assignment={activeAssignmentForSubmissions}
        lang={lang}
        onBack={() => {
          setActiveAssignmentForSubmissions(null);
          loadDashboardData();
        }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Top Welcome & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div>
          <span className="text-sky-400 font-semibold text-xs tracking-wider uppercase mb-1 block">
            马来西亚华小在线作业与批改系统 • SJKC SMART ANSWER
          </span>
          <h1 className="text-2xl sm:text-3xl font-black">
            {currentUser?.displayName || '教师'}，欢迎回到教学控制台
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-2xl">
            实时查看华小学生在线作答情况、数字红笔批改进度与成绩公布。
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-lg shadow-sky-900/50 transition transform hover:-translate-y-0.5 active:translate-y-0 self-start md:self-auto shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>{t.dashboard.createAssignmentBtn}</span>
        </button>
      </div>

      {/* 8 Mandatory Live Data Summary Cards */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>{t.dashboard.summary}</span>
          <span className="text-xs text-slate-400 font-normal">(实时数据库统计)</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Total Assignments */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">{t.dashboard.totalAssignments}</span>
              <FileText className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalAssignments}</div>
            <div className="text-[11px] text-slate-400 mt-1">包含所有科目练习卷</div>
          </div>

          {/* 2. Draft Assignments */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">{t.dashboard.draftAssignments}</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-700">{draftAssignments}</div>
            <div className="text-[11px] text-slate-400 mt-1">待完善后发布</div>
          </div>

          {/* 3. Published Assignments */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">{t.dashboard.publishedAssignments}</span>
              <FileCheck className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-600">{publishedAssignments}</div>
            <div className="text-[11px] text-slate-400 mt-1">已下发至学生端</div>
          </div>

          {/* 4. Total Submissions */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">{t.dashboard.totalSubmissions}</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-600">{totalSubmissions}</div>
            <div className="text-[11px] text-slate-400 mt-1">学生提交的答卷</div>
          </div>

          {/* 5. Pending Marking */}
          <div className="bg-white rounded-2xl p-4 border border-amber-200 bg-amber-50/30 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between text-amber-700 mb-2">
              <span className="text-xs font-semibold">{t.dashboard.pendingMarking}</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600">{pendingMarking}</div>
            <div className="text-[11px] text-amber-700/80 mt-1">等待教师批阅</div>
          </div>

          {/* 6. Marking in Progress */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">{t.dashboard.markingInProgress}</span>
              <Layers className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-orange-600">{markingInProgress}</div>
            <div className="text-[11px] text-slate-400 mt-1">草稿暂存中</div>
          </div>

          {/* 7. Marked Submissions */}
          <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/30 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between text-emerald-700 mb-2">
              <span className="text-xs font-semibold">{t.dashboard.markedSubmissions}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">{markedSubmissions}</div>
            <div className="text-[11px] text-emerald-700/80 mt-1">已发布成绩与评语</div>
          </div>

          {/* 8. Unsubmitted Students */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">{t.dashboard.unsubmitted}</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600">{unsubmittedCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">尚未交卷学生</div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Left Recent Assignments + Right Deadlines & Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Assignments List */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">{t.dashboard.recentAssignments}</h2>
              <p className="text-xs text-slate-400">点击作业卡片进入答卷列表与在线批改</p>
            </div>
            <button
              onClick={() => onNavigateTab('assignments')}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>查看全部</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2 text-sky-500" />
              <span className="text-xs">加载近期作业...</span>
            </div>
          ) : recentAssignments.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              {t.dashboard.noAssignmentsYet}
            </div>
          ) : (
            <div className="space-y-3">
              {recentAssignments.map(asg => {
                const asgSubmissions = submissions.filter(s => s.assignmentId === asg.assignmentId);
                const submittedCount = asgSubmissions.filter(s => s.status === 'submitted').length;
                const markedCount = asgSubmissions.filter(s => s.markingStatus === 'marked').length;

                return (
                  <div
                    key={asg.assignmentId}
                    onClick={() => setActiveAssignmentForSubmissions(asg)}
                    className="p-4 rounded-2xl border border-slate-200/90 hover:border-sky-300 hover:bg-sky-50/30 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {asg.pageCount}页
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {asg.subject}
                          </span>
                          <span className="text-xs text-slate-400">{asg.gradeLevel}</span>
                          {asg.status === 'published' ? (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              已发布
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              草稿
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm mt-1 group-hover:text-sky-600 transition">
                          {asg.title}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span>截止：{new Date(asg.deadline).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>满分：{asg.maximumMarks}分</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <div className="text-right text-xs">
                        <span className="font-bold text-slate-800">{submittedCount}</span>
                        <span className="text-slate-400"> 份已交 (</span>
                        <span className="font-bold text-emerald-600">{markedCount}</span>
                        <span className="text-slate-400"> 已批改)</span>
                      </div>
                      <button
                        onClick={e => handleDeleteAssignment(e, asg.assignmentId)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"
                        title="删除作业"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Deadlines & Class Overview */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-500" />
              <span>{t.dashboard.upcomingDeadlines}</span>
            </h2>

            {upcomingDeadlines.length === 0 ? (
              <div className="text-xs text-slate-400 py-4 text-center">
                近期暂无即将截止的练习卷
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingDeadlines.map(asg => {
                  const daysLeft = Math.ceil(
                    (new Date(asg.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div
                      key={asg.assignmentId}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between"
                    >
                      <div className="truncate mr-2">
                        <div className="font-bold text-slate-800 truncate">{asg.title}</div>
                        <div className="text-slate-500 mt-0.5">
                          {asg.subject} • {new Date(asg.deadline).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                        daysLeft <= 1 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {daysLeft <= 0 ? '今日截止' : `${daysLeft} 天后截止`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Classes Banner */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">执教班级与学生名册</h3>
              <button
                onClick={() => onNavigateTab('classes')}
                className="text-xs text-sky-300 hover:text-white font-medium"
              >
                管理班级 →
              </button>
            </div>
            <div className="text-xs text-slate-300 mb-4">
              当前负责 {classes.length} 个华小班级，在册学生共 {students.length} 人。
            </div>
            <div className="flex flex-wrap gap-2">
              {classes.map(c => (
                <span
                  key={c.classId}
                  className="bg-white/10 px-2.5 py-1 rounded-lg text-xs font-medium border border-white/15"
                >
                  {c.className}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Creation Modal */}
      {showCreateModal && (
        <AssignmentCreateModal
          classes={classes}
          lang={lang}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
};
