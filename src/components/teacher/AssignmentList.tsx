import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  Trash2,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Loader2
} from 'lucide-react';
import { Assignment, SchoolClass, Submission, Language } from '../../types';
import { dbService } from '../../services/dbService';
import { translations } from '../../utils/translations';
import { AssignmentCreateModal } from './AssignmentCreateModal';
import { SubmissionsList } from './SubmissionsList';

interface AssignmentListProps {
  lang: Language;
}

export const AssignmentList: React.FC<AssignmentListProps> = ({ lang }) => {
  const t = translations[lang];

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeAssignmentForSubmissions, setActiveAssignmentForSubmissions] = useState<Assignment | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [asgList, clsList, subList] = await Promise.all([
        dbService.getAssignments(),
        dbService.getClasses(),
        dbService.getSubmissions()
      ]);
      setAssignments(asgList);
      setClasses(clsList);
      setSubmissions(subList);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这份作业吗？其关联的作答记录也将被移除。')) {
      await dbService.deleteAssignment(id);
      loadData();
    }
  };

  const filteredAssignments = assignments.filter(asg => {
    const matchesSearch =
      asg.title.toLowerCase().includes(search.toLowerCase()) ||
      asg.subject.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (subjectFilter !== 'all' && !asg.subject.includes(subjectFilter)) return false;
    return true;
  });

  if (activeAssignmentForSubmissions) {
    return (
      <SubmissionsList
        assignment={activeAssignmentForSubmissions}
        lang={lang}
        onBack={() => {
          setActiveAssignmentForSubmissions(null);
          loadData();
        }}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">作业与练习卷管理 (Tugasan)</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            下发数码练习卷、查看各班答卷回收进度与组织批改
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>创建新练习卷</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索作业名称或科目..."
            className="w-full pl-9 pr-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs text-slate-500 shrink-0">科目筛选：</span>
          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">全部科目 (Semua Subjek)</option>
            <option value="华文">华文 (BC)</option>
            <option value="国文">国文 (BM)</option>
            <option value="英文">英文 (BI)</option>
            <option value="数学">数学 (Matematik)</option>
            <option value="科学">科学 (Sains)</option>
          </select>
        </div>
      </div>

      {/* Assignments Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-sky-500 mr-2" />
          <span className="text-sm">载入作业记录...</span>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400 text-sm">
          未检索到作业记录
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAssignments.map(asg => {
            const asgSubs = submissions.filter(s => s.assignmentId === asg.assignmentId);
            const submittedCount = asgSubs.filter(s => s.status === 'submitted').length;
            const markedCount = asgSubs.filter(s => s.markingStatus === 'marked').length;
            const targetClass = classes.find(c => asg.classIds.includes(c.classId));

            return (
              <div
                key={asg.assignmentId}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Top Subject and Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800">
                      {asg.subject}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      asg.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {asg.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base mb-1.5 line-clamp-2">
                    {asg.title}
                  </h3>

                  <div className="text-xs text-slate-500 space-y-1 mb-4">
                    <div>班级：{targetClass?.className || '全部班级'} ({asg.gradeLevel})</div>
                    <div>满分：{asg.maximumMarks} 分 • 答题卷共 {asg.pageCount} 页</div>
                    <div>截止：{new Date(asg.deadline).toLocaleDateString()}</div>
                  </div>
                </div>

                {/* Bottom stats and action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    <span className="font-bold text-slate-900">{submittedCount}</span> 份已交 (
                    <span className="font-bold text-emerald-600">{markedCount}</span> 已评)
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={e => handleDelete(e, asg.assignmentId)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveAssignmentForSubmissions(asg)}
                      className="flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-sm transition"
                    >
                      <span>答卷列表</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <AssignmentCreateModal
          classes={classes}
          lang={lang}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};
