import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  BookOpen,
  Upload,
  Search,
  CheckCircle2,
  Trash2,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { SchoolClass, UserProfile, Language } from '../../types';
import { dbService } from '../../services/dbService';
import { translations } from '../../utils/translations';

interface ClassManagementProps {
  lang: Language;
}

export const ClassManagement: React.FC<ClassManagementProps> = ({ lang }) => {
  const t = translations[lang];

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // New class modal
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState('三年级 (Standard 3)');
  const [newAcademicYear, setNewAcademicYear] = useState('2026');

  // CSV Import State
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState('');

  const loadClasses = async () => {
    setLoading(true);
    try {
      const clsList = await dbService.getClasses();
      setClasses(clsList);
      if (clsList.length > 0 && !selectedClass) {
        setSelectedClass(clsList[0]);
      }
    } catch (err) {
      console.error('Failed to load classes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    const currentClassId = selectedClass.classId;
    async function fetchStudents() {
      try {
        const list = await dbService.getStudentsByClass(currentClassId);
        setStudents(list);
      } catch (err) {
        console.error('Failed to load class students:', err);
      }
    }
    fetchStudents();
  }, [selectedClass]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    try {
      const classId = `class_${Date.now()}`;
      const created = await dbService.createClass({
        classId,
        schoolId: 'sjkc-yuk-choy',
        className: newClassName,
        gradeLevel: newGradeLevel,
        academicYear: newAcademicYear,
        teacherIds: ['teacher-tan-01'],
        studentIds: []
      });
      setClasses(prev => [...prev, created]);
      setSelectedClass(created);
      setShowAddClassModal(false);
      setNewClassName('');
    } catch (err) {
      console.error('Create class error:', err);
      alert('创建班级失败');
    }
  };

  const handleImportCsv = async () => {
    if (!csvText.trim() || !selectedClass) return;
    const lines = csvText.split('\n');
    let count = 0;

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const [name, studentId] = parts;
        if (name && studentId && !name.includes('姓名')) {
          const uid = `stu_${Date.now()}_${count}`;
          await dbService.addStudent({
            uid,
            displayName: name,
            studentId,
            email: `${studentId.toLowerCase()}@sjkc.edu.my`,
            role: 'student',
            schoolId: 'sjkc-yuk-choy',
            classIds: [selectedClass.classId],
            accountStatus: 'active'
          });
          count++;
        }
      }
    }

    setShowCsvModal(false);
    setCsvText('');
    // Reload students
    const list = await dbService.getStudentsByClass(selectedClass.classId);
    setStudents(list);
    alert(`成功为 ${selectedClass.className} 导入 ${count} 位学生！`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">班级管理 (Pengurusan Kelas)</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            设置马来西亚华小学年班级、学生名册与批量导入
          </p>
        </div>

        <button
          onClick={() => setShowAddClassModal(true)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>创建新班级</span>
        </button>
      </div>

      {/* Main Grid: Left Class List + Right Student Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm h-fit">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
            <span>我的班级列表</span>
            <span className="text-xs text-slate-400 font-normal">共 {classes.length} 班</span>
          </h2>

          <div className="space-y-2">
            {classes.map(cls => (
              <button
                key={cls.classId}
                onClick={() => setSelectedClass(cls)}
                className={`w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between ${
                  selectedClass?.classId === cls.classId
                    ? 'bg-sky-50 border-sky-300 text-sky-900 font-bold shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <div className="text-sm">{cls.className}</div>
                  <div className="text-xs text-slate-400 font-normal mt-0.5">
                    {cls.gradeLevel} • 学年 {cls.academicYear}
                  </div>
                </div>
                <Users className="w-4 h-4 text-slate-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel: Class Students Roster */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          {selectedClass ? (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedClass.className} 学生名单
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedClass.gradeLevel} • 已注册 {students.length} 位学生
                  </p>
                </div>

                <button
                  onClick={() => setShowCsvModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition self-start sm:self-auto"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>CSV 批量导入学生</span>
                </button>
              </div>

              {students.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs sm:text-sm">
                  该班级暂无学生记录，请点击上方按钮批量导入或添加学生。
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">学生姓名</th>
                        <th className="py-2.5 px-3">华小学号</th>
                        <th className="py-2.5 px-3">账号邮箱</th>
                        <th className="py-2.5 px-3 text-right">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map(s => (
                        <tr key={s.uid} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            {s.displayName}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600">
                            {s.studentId || '-'}
                          </td>
                          <td className="py-3 px-3 text-slate-500 text-xs">
                            {s.email}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                              正常在籍
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 text-sm">
              请选择一个班级查看详情
            </div>
          )}
        </div>
      </div>

      {/* Create Class Modal */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">创建新班级</h3>
            <form onSubmit={handleCreateClass} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="font-semibold block mb-1">班级名称 (例如：3 红班 / 3 Merah) *</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  placeholder="3 红班 (3 Merah)"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">年级 *</label>
                <select
                  value={newGradeLevel}
                  onChange={e => setNewGradeLevel(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="一年级 (Standard 1)">一年级 (Standard 1)</option>
                  <option value="二年级 (Standard 2)">二年级 (Standard 2)</option>
                  <option value="三年级 (Standard 3)">三年级 (Standard 3)</option>
                  <option value="四年级 (Standard 4)">四年级 (Standard 4)</option>
                  <option value="五年级 (Standard 5)">五年级 (Standard 5)</option>
                  <option value="六年级 (Standard 6)">六年级 (Standard 6)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">学年 *</label>
                <input
                  type="text"
                  value={newAcademicYear}
                  onChange={e => setNewAcademicYear(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow"
                >
                  确认创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>CSV 批量导入学生至 {selectedClass?.className}</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              格式：每行一位学生，格式为 “姓名, 学号” (支持直接复制粘贴 Excel 列)
            </p>

            <textarea
              rows={8}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder={`林小明, SJKC-3M-01\n黄丽美, SJKC-3M-02\n陈伟杰, SJKC-3M-03\n张俊豪, SJKC-3M-04`}
              className="w-full border border-slate-300 rounded-xl p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 mb-4"
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCsvModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-medium"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleImportCsv}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow"
              >
                开始导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
