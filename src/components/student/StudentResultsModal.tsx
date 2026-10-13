import React, { useState, useEffect } from 'react';
import {
  X,
  Award,
  MessageSquare,
  Sparkles,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import {
  Assignment,
  Submission,
  MarkingRecord,
  Language
} from '../../types';
import { dbService } from '../../services/dbService';
import { translations } from '../../utils/translations';

interface StudentResultsModalProps {
  assignment: Assignment;
  submission: Submission;
  lang: Language;
  onClose: () => void;
  onOpenWorksheet: () => void;
}

export const StudentResultsModal: React.FC<StudentResultsModalProps> = ({
  assignment,
  submission,
  lang,
  onClose,
  onOpenWorksheet
}) => {
  const t = translations[lang];
  const [marking, setMarking] = useState<MarkingRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMarking() {
      try {
        const mark = await dbService.getMarking(submission.submissionId);
        setMarking(mark);
      } catch (err) {
        console.error('Failed to load student result:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMarking();
  }, [submission.submissionId]);

  const percentage = submission.totalMarks !== undefined
    ? Math.round((submission.totalMarks / assignment.maximumMarks) * 100)
    : 0;

  // Grade classification according to Malaysian primary school standards (Tahap Penguasaan / TP or A-E)
  const getGradeBadge = (pct: number) => {
    if (pct >= 85) return { grade: 'A (特优)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (pct >= 70) return { grade: 'B (良好)', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (pct >= 50) return { grade: 'C (满意)', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    if (pct >= 40) return { grade: 'D (需努力)', color: 'bg-orange-100 text-orange-800 border-orange-300' };
    return { grade: 'E (尚未掌握)', color: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  const badge = getGradeBadge(percentage);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 to-indigo-700 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-sky-200 text-xs font-semibold mb-1 uppercase tracking-wider">
            <Award className="w-4 h-4" />
            <span>批改结果与综合评语</span>
          </div>

          <h2 className="text-xl font-bold">{assignment.title}</h2>
          <div className="flex items-center gap-3 mt-2 text-xs text-sky-100">
            <span>{assignment.subject}</span>
            <span>•</span>
            <span>{assignment.gradeLevel}</span>
          </div>
        </div>

        {/* Score Card */}
        <div className="p-6 space-y-6">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium block">得分与等第</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-extrabold text-slate-900">
                  {submission.totalMarks ?? marking?.totalAwarded ?? '-'}
                </span>
                <span className="text-base text-slate-500 font-medium">
                  / {assignment.maximumMarks} 分
                </span>
                <span className="text-sm font-semibold text-sky-600 ml-1">
                  ({percentage}%)
                </span>
              </div>
            </div>

            <div className={`px-3.5 py-1.5 rounded-full border text-xs font-bold ${badge.color}`}>
              {badge.grade}
            </div>
          </div>

          {/* Teacher Overall Feedback */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sky-600" />
              <span>教师评语 (Teacher Feedback)</span>
            </h3>
            <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-4 text-sm text-slate-700 leading-relaxed italic">
              {marking?.overallFeedback ? (
                `“${marking.overallFeedback}”`
              ) : (
                <span className="text-slate-400 not-italic">老师已完成批改并登记总分。</span>
              )}
            </div>
          </div>

          {/* Question breakdown if exists */}
          {marking?.questionScores && marking.questionScores.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>分题得分明细</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {marking.questionScores.map((q, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                    <span className="text-slate-500 block">题目 {q.questionNumber}</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {q.marksAwarded} / {q.maxMarks} 分
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action button to open marked worksheet */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onOpenWorksheet}
              className="flex-1 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md transition text-sm"
            >
              <FileCheck className="w-4 h-4" />
              <span>查看批改后的答题卷 (含红笔手迹)</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium transition"
            >
              {t.common.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
