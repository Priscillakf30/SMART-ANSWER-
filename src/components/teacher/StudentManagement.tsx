import React, { useState, useEffect } from 'react';
import {
  Search,
  UserCheck,
  User,
  GraduationCap,
  Filter,
  Plus,
  Loader2
} from 'lucide-react';
import { UserProfile, SchoolClass, Language } from '../../types';
import { dbService } from '../../services/dbService';
import { translations } from '../../utils/translations';

interface StudentManagementProps {
  lang: Language;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({ lang }) => {
  const t = translations[lang];

  const [students, setStudents] = useState<UserProfile[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  // Add Student modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newClassId, setNewClassId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const cls = await dbService.getClasses();
      setClasses(cls);
      if (cls.length > 0 && !newClassId) {
        setNewClassId(cls[0].classId);
      }
      const allStudents = await dbService.getStudentsByClass();
      setStudents(allStudents);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.displayName.toLowerCase().includes(search.toLowerCase()) ||
      (s.studentId && s.studentId.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (classFilter !== 'all' && !s.classIds?.includes(classFilter)) return false;
    return true;
  });

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisplayName.trim() || !newStudentId.trim()) return;

    try {
      const uid = `stu_${Date.now()}`;
      const newStu: UserProfile = {
        uid,
        displayName: newDisplayName,
        studentId: newStudentId,
        email: `${newStudentId.toLowerCase()}@sjkc.edu.my`,
        role: 'student',
        schoolId: 'sjkc-yuk-choy',
        classIds: [newClassId],
        accountStatus: 'active'
      };
      await dbService.addStudent(newStu);
      setStudents(prev => [...prev, newStu]);
      setShowAddModal(false);
      setNewDisplayName('');
      setNewStudentId('');
    } catch (err) {
      console.error('Add student error:', err);
      alert('添加学生失败');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">学生名册管理 (Pengurusan Murid)</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            登记学生资料、班级分配、检索学号与账号状态
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>添加新学生</span>
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
            placeholder="搜索学生姓名、中文名或学号..."
            className="w-full pl-9 pr-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs text-slate-500 shrink-0">班级筛选：</span>
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">全部班级 (Semua Kelas)</option>
            {classes.map(c => (
              <option key={c.classId} value={c.classId}>
                {c.className}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500 mr-2" />
            <span className="text-sm">载入学生名单...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            没有找到匹配的学生记录
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">学生姓名</th>
                  <th className="py-3 px-4">华小学号</th>
                  <th className="py-3 px-4">所属班级</th>
                  <th className="py-3 px-4">系统账号邮箱</th>
                  <th className="py-3 px-4 text-right">账号状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(student => {
                  const studentClass = classes.find(c => student.classIds?.includes(c.classId));
                  return (
                    <tr key={student.uid} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-xs">
                          {student.displayName.charAt(0)}
                        </div>
                        <div>
                          <div>{student.displayName}</div>
                          <div className="text-[11px] text-slate-400 font-normal">SJKC 学生</div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        {student.studentId || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {studentClass?.className || '未分配'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">
                        {student.email}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <UserCheck className="w-3.5 h-3.5" />
                          已就绪
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">登记新学生</h3>
            <form onSubmit={handleAddStudent} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="font-semibold block mb-1">学生全名 (中文名及拼音) *</label>
                <input
                  type="text"
                  required
                  value={newDisplayName}
                  onChange={e => setNewDisplayName(e.target.value)}
                  placeholder="例如：黄丽美 (Wong Li Mei)"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">学号 (Student ID) *</label>
                <input
                  type="text"
                  required
                  value={newStudentId}
                  onChange={e => setNewStudentId(e.target.value)}
                  placeholder="例如：SJKC-3M-05"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">分派班级 *</label>
                <select
                  value={newClassId}
                  onChange={e => setNewClassId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {classes.map(c => (
                    <option key={c.classId} value={c.classId}>
                      {c.className} ({c.gradeLevel})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow"
                >
                  确认登记
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
