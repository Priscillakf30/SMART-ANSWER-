import React, { useState } from 'react';
import {
  X,
  Upload,
  BookOpen,
  FileCheck,
  Calendar,
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Assignment, SchoolClass, Language } from '../../types';
import { dbService } from '../../services/dbService';
import { useAuth } from '../../contexts/AuthContext';
import { translations } from '../../utils/translations';

interface AssignmentCreateModalProps {
  classes: SchoolClass[];
  lang: Language;
  onClose: () => void;
  onCreated: (newAssignment: Assignment) => void;
}

const SJKC_SUBJECTS = [
  '华文 (Bahasa Cina)',
  '国文 (Bahasa Melayu)',
  '英文 (English)',
  '数学 (Matematik)',
  '科学 (Sains)',
  '历史 (Sejarah)',
  '道德教育 (Pendidikan Moral)'
];

const SJKC_GRADES = [
  '一年级 (Standard 1)',
  '二年级 (Standard 2)',
  '三年级 (Standard 3)',
  '四年级 (Standard 4)',
  '五年级 (Standard 5)',
  '六年级 (Standard 6)'
];

export const AssignmentCreateModal: React.FC<AssignmentCreateModalProps> = ({
  classes,
  lang,
  onClose,
  onCreated
}) => {
  const { currentUser } = useAuth();
  const t = translations[lang];

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(SJKC_SUBJECTS[0]);
  const [gradeLevel, setGradeLevel] = useState(SJKC_GRADES[2]); // Default standard 3
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.classId || '');
  const [instructions, setInstructions] = useState('');
  const [maximumMarks, setMaximumMarks] = useState(50);
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16)
  );
  const [allowResubmission, setAllowResubmission] = useState(true);
  const [feedbackReleaseSettings, setFeedbackReleaseSettings] = useState<'immediate' | 'manual'>('immediate');

  // Worksheet Pages (Base64 SVG or images)
  const [worksheetPages, setWorksheetPages] = useState<string[]>([]);
  const [worksheetFileName, setWorksheetFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle local file upload (images or simulated PDF)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMsg('');
    const pages: string[] = [];
    setWorksheetFileName(files[0].name);

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = evt => {
        if (evt.target?.result) {
          pages.push(evt.target.result as string);
          if (pages.length === files.length) {
            setWorksheetPages(pages);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (publishNow: boolean) => {
    if (!title.trim()) {
      setErrorMsg('请输入作业标题');
      return;
    }
    if (worksheetPages.length === 0) {
      setErrorMsg('请上传练习卷 (支持单页或多页图片/PDF)');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const asgId = `asg_${Date.now()}`;
      const newAsg: Assignment = {
        assignmentId: asgId,
        schoolId: 'sjkc-yuk-choy',
        teacherId: currentUser?.uid || 'teacher-01',
        teacherName: currentUser?.displayName || '陈老师',
        classIds: [selectedClassId],
        title,
        subject,
        gradeLevel,
        instructions,
        worksheetPages,
        worksheetFileName: worksheetFileName || 'worksheet.svg',
        worksheetFileType: 'image',
        pageCount: worksheetPages.length,
        maximumMarks,
        deadline: new Date(deadline).toISOString(),
        status: publishNow ? 'published' : 'draft',
        allowResubmission,
        feedbackReleaseSettings,
        createdAt: now,
        publishedAt: publishNow ? now : undefined,
        updatedAt: now
      };

      await dbService.createAssignment(newAsg);
      setSaving(false);
      onCreated(newAsg);
    } catch (err) {
      console.error('Failed to create assignment:', err);
      setErrorMsg('创建作业失败，请重试。');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold">创建数码练习卷作业</h2>
            <p className="text-xs text-slate-400">分派练习题、设置满分与作答截止时间</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="font-semibold block mb-1">作业标题 *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="例如：三年级 华文单元一 阅读理解练习卷"
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="font-semibold block mb-1">科目 *</label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                {SJKC_SUBJECTS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Grade */}
            <div>
              <label className="font-semibold block mb-1">年级 *</label>
              <select
                value={gradeLevel}
                onChange={e => setGradeLevel(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                {SJKC_GRADES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Target Class */}
            <div>
              <label className="font-semibold block mb-1">分派班级 *</label>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                {classes.map(c => (
                  <option key={c.classId} value={c.classId}>
                    {c.className} ({c.gradeLevel})
                  </option>
                ))}
              </select>
            </div>

            {/* Total Marks */}
            <div>
              <label className="font-semibold block mb-1">总分 (分) *</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={maximumMarks}
                onChange={e => setMaximumMarks(parseInt(e.target.value) || 100)}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Deadline */}
            <div className="sm:col-span-2">
              <label className="font-semibold block mb-1">截止日期与时间 *</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Instructions */}
            <div className="sm:col-span-2">
              <label className="font-semibold block mb-1">作答指引 / 说明</label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={3}
                placeholder="例如：请用手指或手写笔在答题格内端正作答，完成全部页面后点击提交。"
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Worksheet File Upload & Preview */}
          <div className="border-t border-slate-100 pt-4">
            <label className="font-bold text-slate-900 block mb-1.5 flex items-center justify-between">
              <span>上传自定义多页练习卷 (PNG/JPG/PDF)</span>
              {worksheetPages.length > 0 && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  已加载 {worksheetPages.length} 页练习卷
                </span>
              )}
            </label>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center hover:border-sky-400 transition bg-slate-50/50">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-600 mb-2">
                拖拽或选择单页/多页练习卷图片 (支持多次或批量选择)
              </p>
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
              />
            </div>

            {/* Thumbnail Preview */}
            {worksheetPages.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto p-2 bg-slate-100 rounded-xl">
                {worksheetPages.map((pageUrl, idx) => (
                  <div key={idx} className="relative shrink-0 border border-slate-300 rounded-lg overflow-hidden bg-white w-20 h-28 shadow-sm">
                    <img src={pageUrl} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">
                      P{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Advanced Settings */}
          <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowResubmission}
                onChange={e => setAllowResubmission(e.target.checked)}
                className="rounded text-sky-600 focus:ring-sky-500"
              />
              <span>允许退回修改并再次提交</span>
            </label>

            <div className="flex items-center gap-2">
              <span>成绩公布策略：</span>
              <select
                value={feedbackReleaseSettings}
                onChange={e => setFeedbackReleaseSettings(e.target.value as any)}
                className="border border-slate-300 rounded-lg px-2 py-1 bg-white text-xs"
              >
                <option value="immediate">教师批改后立即公布</option>
                <option value="manual">教师手动统一公布</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs sm:text-sm font-medium transition"
          >
            {t.common.cancel}
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-medium transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
            保存为草稿
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-semibold shadow-md transition flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
            <span>正式发布作业</span>
          </button>
        </div>
      </div>
    </div>
  );
};
