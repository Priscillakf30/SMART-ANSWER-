import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileEdit,
  Award,
  User,
  ExternalLink,
  Loader2
} from 'lucide-react';
import {
  Assignment,
  Submission,
  UserProfile,
  Language
} from '../../types';
import { dbService } from '../../services/dbService';
import { translations } from '../../utils/translations';
import { MarkingCentre } from './MarkingCentre';

interface SubmissionsListProps {
  assignment: Assignment;
  lang: Language;
  onBack: () => void;
}

export const SubmissionsList: React.FC<SubmissionsListProps> = ({
  assignment,
  lang,
  onBack
}) => {
  const t = translations[lang];

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unsubmitted' | 'submitted' | 'marked'>('all');

  // Active student in Marking Centre
  const [activeSubmissionForMarking, setActiveSubmissionForMarking] = useState<Submission | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Get all students for the assignment's class
      const classId = assignment.classIds[0];
      const classStudents = await dbService.getStudentsByClass(classId);
      setStudents(classStudents);

      // 2. Get existing submissions
      const subs = await dbService.getSubmissions(assignment.assignmentId);
      setSubmissions(subs);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Setup live Firestore subscription
    const unsubscribe = dbService.subscribeToSubmissions(assignment.assignmentId, updatedSubs => {
      setSubmissions(updatedSubs);
    });

    return () => unsubscribe();
  }, [assignment.assignmentId]);

  // Combine students with their submission records (if not yet started, create representation)
  const studentRows = students.map(student => {
    const existingSub = submissions.find(s => s.studentId === student.uid);
    return {
      student,
      submission: existingSub || ({
        submissionId: `sub_${assignment.assignmentId}_${student.uid}`,
        assignmentId: assignment.assignmentId,
        studentId: student.uid,
        studentName: student.displayName,
        studentNumber: student.studentId,
        classId: student.classIds?.[0] || 'class-3-merah',
        schoolId: assignment.schoolId,
        status: 'not_started',
        currentVersion: 0,
        markingStatus: 'pending',
        maximumMarks: assignment.maximumMarks,
        createdAt: '',
        updatedAt: ''
      } as Submission)
    };
  });

  // Filter rows
  const filteredRows = studentRows.filter(row => {
    const matchesSearch =
      row.student.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.student.studentId && row.student.studentId.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'unsubmitted') {
      return row.submission.status !== 'submitted';
    }
    if (statusFilter === 'submitted') {
      return row.submission.status === 'submitted' && row.submission.markingStatus !== 'marked';
    }
    if (statusFilter === 'marked') {
      return row.submission.markingStatus === 'marked';
    }
    return true;
  });

  const submittedSubmissionsList = submissions.filter(s => s.status === 'submitted' || s.status === 'in_progress');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{assignment.title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {assignment.subject} • {assignment.gradeLevel} • 满分 {assignment.maximumMarks} 分
            </p>
          </div>
        </div>

        {/* Quick Batch Marking Launch */}
        {submittedSubmissionsList.length > 0 && (
          <button
            onClick={() => setActiveSubmissionForMarking(submittedSubmissionsList[0])}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md transition self-start sm:self-auto"
          >
            <FileEdit className="w-4 h-4" />
            <span>进入在线批改中心 (共 {submittedSubmissionsList.length} 份答卷)</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索学生姓名或学号..."
            className="w-full pl-9 pr-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            全部 ({studentRows.length})
          </button>
          <button
            onClick={() => setStatusFilter('submitted')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'submitted'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            待批改 ({submissions.filter(s => s.status === 'submitted' && s.markingStatus !== 'marked').length})
          </button>
          <button
            onClick={() => setStatusFilter('marked')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'marked'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            已批改 ({submissions.filter(s => s.markingStatus === 'marked').length})
          </button>
          <button
            onClick={() => setStatusFilter('unsubmitted')}
            className={`px-3 py-1.5 rounded-lg transition ${
              statusFilter === 'unsubmitted'
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            未交卷 ({studentRows.filter(r => r.submission.status !== 'submitted').length})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500 mr-2" />
            <span className="text-sm">载入学生名单与答卷状态...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            没有符合条件的学生答卷记录
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">学生姓名 / 学号</th>
                  <th className="py-3.5 px-4">状态</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">提交时间</th>
                  <th className="py-3.5 px-4">得分 / 等第</th>
                  <th className="py-3.5 px-4 text-right">批改操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map(({ student, submission }) => {
                  const isSubmitted = submission.status === 'submitted';
                  const isMarked = submission.markingStatus === 'marked';
                  const subTime = submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : '-';

                  return (
                    <tr key={student.uid} className="hover:bg-slate-50/80 transition">
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{student.displayName}</div>
                        <div className="text-xs text-slate-400 font-mono">
                          {student.studentId || student.uid}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isMarked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            已批改完成
                          </span>
                        ) : isSubmitted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3.5 h-3.5" />
                            已交待批
                          </span>
                        ) : submission.status === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            作答中
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs text-slate-500 bg-slate-100">
                            尚未作答
                          </span>
                        )}
                      </td>

                      {/* Submit Time */}
                      <td className="py-3.5 px-4 text-slate-500 text-xs hidden sm:table-cell">
                        {subTime}
                      </td>

                      {/* Score */}
                      <td className="py-3.5 px-4">
                        {isMarked ? (
                          <div className="font-bold text-slate-900">
                            <span className="text-emerald-700 font-extrabold text-base">
                              {submission.totalMarks}
                            </span>
                            <span className="text-slate-400 text-xs"> / {assignment.maximumMarks} 分</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setActiveSubmissionForMarking(submission)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            isMarked
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : isSubmitted
                              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          <span>{isMarked ? '修改批改' : isSubmitted ? '立即批改' : '查阅答卷'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Marking Centre Modal / Fullscreen */}
      {activeSubmissionForMarking && (
        <MarkingCentre
          assignment={assignment}
          submission={activeSubmissionForMarking}
          allSubmissions={submittedSubmissionsList.length > 0 ? submittedSubmissionsList : [activeSubmissionForMarking]}
          lang={lang}
          onBack={() => {
            setActiveSubmissionForMarking(null);
            loadData();
          }}
          onSelectSubmission={sub => setActiveSubmissionForMarking(sub)}
        />
      )}
    </div>
  );
};
