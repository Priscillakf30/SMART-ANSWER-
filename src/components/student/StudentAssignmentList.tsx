import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  ChevronRight,
  Award,
  Loader2
} from 'lucide-react';
import {
  Assignment,
  Submission,
  Language
} from '../../types';
import { dbService } from '../../services/dbService';
import { useAuth } from '../../contexts/AuthContext';
import { translations } from '../../utils/translations';
import { DigitalWorksheetEditor } from './DigitalWorksheetEditor';
import { StudentResultsModal } from './StudentResultsModal';

interface StudentAssignmentListProps {
  lang: Language;
}

export const StudentAssignmentList: React.FC<StudentAssignmentListProps> = ({ lang }) => {
  const { currentUser } = useAuth();
  const t = translations[lang];

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);

  // Active modal / editor states
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);

  const [filterTab, setFilterTab] = useState<'pending' | 'completed'>('pending');

  const loadStudentData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const allAsg = await dbService.getAssignments();
      // Filter published assignments matching student's class
      const studentClassId = currentUser.classIds?.[0] || 'class-3-merah';
      const studentAsg = allAsg.filter(
        a => a.status === 'published' && (a.classIds.includes(studentClassId) || a.classIds.length === 0)
      );
      setAssignments(studentAsg);

      // Fetch student submissions for each assignment
      const subMap: Record<string, Submission> = {};
      for (const asg of studentAsg) {
        const sub = await dbService.getStudentSubmission(asg.assignmentId, currentUser.uid);
        if (sub) {
          subMap[asg.assignmentId] = sub;
        }
      }
      setSubmissions(subMap);
    } catch (err) {
      console.error('Failed to load student assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [currentUser]);

  const handleOpenWorksheet = async (asg: Assignment) => {
    if (!currentUser) return;
    try {
      const sub = await dbService.getOrCreateSubmission(asg, currentUser);
      setActiveAssignment(asg);
      setActiveSubmission(sub);
      setShowEditor(true);
    } catch (err) {
      console.error('Could not open worksheet:', err);
    }
  };

  const handleOpenResults = (asg: Assignment, sub: Submission) => {
    setActiveAssignment(asg);
    setActiveSubmission(sub);
    setShowResultsModal(true);
  };

  // Group into pending vs completed
  const pendingAssignments = assignments.filter(asg => {
    const sub = submissions[asg.assignmentId];
    return !sub || sub.status !== 'submitted';
  });

  const completedAssignments = assignments.filter(asg => {
    const sub = submissions[asg.assignmentId];
    return sub && sub.status === 'submitted';
  });

  const displayList = filterTab === 'pending' ? pendingAssignments : completedAssignments;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black">
              同学好，{currentUser?.displayName || '同学'}！
            </h1>
            <p className="text-sky-100 text-xs md:text-sm mt-1">
              学号：{currentUser?.studentId || 'SJKC-2026'}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-white/20 self-start sm:self-auto text-xs">
            <span>待完成作业：</span>
            <span className="font-bold text-amber-300 text-sm">{pendingAssignments.length}</span>
            <span className="ml-2">已完成：</span>
            <span className="font-bold text-emerald-300 text-sm">{completedAssignments.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setFilterTab('pending')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            filterTab === 'pending'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>待完成作业 ({pendingAssignments.length})</span>
        </button>
        <button
          onClick={() => setFilterTab('completed')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            filterTab === 'completed'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>已交答卷与成绩 ({completedAssignments.length})</span>
        </button>
      </div>

      {/* Assignments List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500 mb-3" />
          <p className="text-sm">正在加载作业列表...</p>
        </div>
      ) : displayList.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm">
          <div className="w-16 h-16 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {filterTab === 'pending' ? '太棒了！暂无待完成作业' : '暂无已完成作业'}
          </h3>
          <p className="text-xs text-slate-500">
            {filterTab === 'pending' ? '所有发布的练习卷均已交齐。' : '完成作答后，你的历史卷和老师批改将显示在这里。'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {displayList.map(asg => {
            const sub = submissions[asg.assignmentId];
            const isSubmitted = sub?.status === 'submitted';
            const isMarked = sub?.markingStatus === 'marked';
            const deadlineDate = new Date(asg.deadline);
            const isPastDue = deadlineDate.getTime() < Date.now();

            return (
              <div
                key={asg.assignmentId}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Subject and Status Pills */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                      {asg.subject}
                    </span>

                    {isMarked ? (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        得分：{sub.totalMarks} / {asg.maximumMarks}
                      </span>
                    ) : isSubmitted ? (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        已提交 • 等待批改
                      </span>
                    ) : sub?.status === 'in_progress' ? (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        作答中 (已暂存草稿)
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        未开始
                      </span>
                    )}
                  </div>

                  {/* Title & Grade */}
                  <h3 className="font-bold text-slate-900 text-base mb-1 line-clamp-2">
                    {asg.title}
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    {asg.teacherName || '任课教师'} • {asg.pageCount} 页数码答题卷
                  </p>

                  {/* Instructions snippet */}
                  {asg.instructions && (
                    <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-lg mb-4">
                      {asg.instructions}
                    </p>
                  )}

                  {/* Deadline */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>截止：{deadlineDate.toLocaleDateString()} {deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  {isMarked ? (
                    <button
                      onClick={() => handleOpenResults(asg, sub)}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-3 rounded-xl text-xs shadow-sm transition"
                    >
                      <Award className="w-4 h-4" />
                      <span>查看成绩与红笔批改</span>
                    </button>
                  ) : isSubmitted ? (
                    <button
                      onClick={() => handleOpenWorksheet(asg)}
                      className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-3 rounded-xl text-xs transition"
                    >
                      <FileText className="w-4 h-4" />
                      <span>查阅已交答卷</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenWorksheet(asg)}
                      className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-3 rounded-xl text-xs shadow-sm transition"
                    >
                      <span>{sub ? '继续在线作答' : '进入数码练习卷'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Digital Worksheet Editor Modal */}
      {showEditor && activeAssignment && activeSubmission && (
        <DigitalWorksheetEditor
          assignment={activeAssignment}
          submission={activeSubmission}
          lang={lang}
          onClose={() => {
            setShowEditor(false);
            loadStudentData();
          }}
          onSubmitSuccess={() => {
            setShowEditor(false);
            loadStudentData();
          }}
        />
      )}

      {/* Results & Teacher Feedback Modal */}
      {showResultsModal && activeAssignment && activeSubmission && (
        <StudentResultsModal
          assignment={activeAssignment}
          submission={activeSubmission}
          lang={lang}
          onClose={() => setShowResultsModal(false)}
          onOpenWorksheet={() => {
            setShowResultsModal(false);
            setShowEditor(true);
          }}
        />
      )}
    </div>
  );
};
