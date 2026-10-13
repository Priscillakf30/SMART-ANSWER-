import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  SchoolClass,
  Assignment,
  Submission,
  AnswerPageData,
  MarkingRecord,
  UserProfile
} from '../types';
import { SAMPLES_CATALOG } from '../utils/worksheetSamples';

// Local storage key prefix for offline draft resilience
const DRAFT_PREFIX = 'smart_answer_draft_';

export const dbService = {
  // ===================== CLASSES =====================
  async getClasses(): Promise<SchoolClass[]> {
    const collPath = 'classes';
    try {
      const snap = await getDocs(collection(db, collPath));
      if (snap.empty) {
        // Seed default SJKC classes if empty
        const defaultClasses: SchoolClass[] = [
          {
            classId: 'class-3-merah',
            schoolId: 'sjkc-yuk-choy',
            className: '3 红班 (3 Merah)',
            gradeLevel: '三年级 (Standard 3)',
            academicYear: '2026',
            teacherIds: ['teacher-tan-01'],
            studentIds: ['student-01', 'student-02', 'student-03'],
            createdAt: new Date().toISOString()
          },
          {
            classId: 'class-4-biru',
            schoolId: 'sjkc-yuk-choy',
            className: '4 蓝班 (4 Biru)',
            gradeLevel: '四年级 (Standard 4)',
            academicYear: '2026',
            teacherIds: ['teacher-tan-01'],
            studentIds: ['student-04', 'student-05'],
            createdAt: new Date().toISOString()
          }
        ];
        for (const cls of defaultClasses) {
          await setDoc(doc(db, collPath, cls.classId), cls);
        }
        return defaultClasses;
      }
      return snap.docs.map(d => d.data() as SchoolClass);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, collPath);
    }
  },

  async createClass(newClass: Omit<SchoolClass, 'createdAt' | 'updatedAt'>): Promise<SchoolClass> {
    const collPath = 'classes';
    const now = new Date().toISOString();
    const item: SchoolClass = { ...newClass, createdAt: now, updatedAt: now };
    try {
      await setDoc(doc(db, collPath, item.classId), item);
      return item;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${collPath}/${item.classId}`);
    }
  },

  // ===================== STUDENTS & USERS =====================
  async getStudentsByClass(classId?: string): Promise<UserProfile[]> {
    const collPath = 'users';
    try {
      const snap = await getDocs(collection(db, collPath));
      if (snap.empty) {
        // Seed realistic SJKC student accounts if none exist
        const defaultStudents: UserProfile[] = [
          {
            uid: 'student-01',
            displayName: '林小明 (Lim Xiao Ming)',
            email: 'xiaoming@sjkc.edu.my',
            role: 'student',
            studentId: 'SJKC-3M-01',
            schoolId: 'sjkc-yuk-choy',
            classIds: ['class-3-merah'],
            accountStatus: 'active'
          },
          {
            uid: 'student-02',
            displayName: '黄丽美 (Wong Li Mei)',
            email: 'limei@sjkc.edu.my',
            role: 'student',
            studentId: 'SJKC-3M-02',
            schoolId: 'sjkc-yuk-choy',
            classIds: ['class-3-merah'],
            accountStatus: 'active'
          },
          {
            uid: 'student-03',
            displayName: '陈伟杰 (Tan Wei Jie)',
            email: 'weijie@sjkc.edu.my',
            role: 'student',
            studentId: 'SJKC-3M-03',
            schoolId: 'sjkc-yuk-choy',
            classIds: ['class-3-merah'],
            accountStatus: 'active'
          },
          {
            uid: 'student-04',
            displayName: '张秀丽 (Teo Siew Li)',
            email: 'siewli@sjkc.edu.my',
            role: 'student',
            studentId: 'SJKC-4B-01',
            schoolId: 'sjkc-yuk-choy',
            classIds: ['class-4-biru'],
            accountStatus: 'active'
          }
        ];
        for (const s of defaultStudents) {
          await setDoc(doc(db, collPath, s.uid), s);
        }
        return classId
          ? defaultStudents.filter(s => s.classIds?.includes(classId))
          : defaultStudents;
      }
      const all = snap.docs.map(d => d.data() as UserProfile);
      const students = all.filter(u => u.role === 'student');
      return classId
        ? students.filter(s => s.classIds?.includes(classId))
        : students;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, collPath);
    }
  },

  async addStudent(student: UserProfile): Promise<void> {
    const collPath = 'users';
    try {
      await setDoc(doc(db, collPath, student.uid), {
        ...student,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${collPath}/${student.uid}`);
    }
  },

  // ===================== ASSIGNMENTS =====================
  async getAssignments(): Promise<Assignment[]> {
    const collPath = 'assignments';
    try {
      const snap = await getDocs(collection(db, collPath));
      if (snap.empty) {
        // Seed initial sample SJKC assignments from our authentic templates
        const initialAssignments: Assignment[] = SAMPLES_CATALOG.map((tpl, idx) => ({
          assignmentId: `asg-${tpl.id}`,
          schoolId: 'sjkc-yuk-choy',
          teacherId: 'teacher-tan-01',
          teacherName: '陈老师 (Cikgu Tan)',
          classIds: idx === 0 ? ['class-3-merah'] : ['class-4-biru'],
          title: tpl.title,
          subject: tpl.subject,
          gradeLevel: tpl.gradeLevel,
          instructions: tpl.instructions,
          worksheetPages: tpl.pages,
          worksheetFileName: `${tpl.id}.svg`,
          worksheetFileType: 'image',
          pageCount: tpl.pageCount,
          maximumMarks: tpl.maximumMarks,
          deadline: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
          status: 'published',
          allowResubmission: true,
          feedbackReleaseSettings: 'immediate',
          createdAt: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        for (const asg of initialAssignments) {
          await setDoc(doc(db, collPath, asg.assignmentId), asg);
        }
        return initialAssignments;
      }
      return snap.docs.map(d => d.data() as Assignment);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, collPath);
    }
  },

  async getAssignmentById(assignmentId: string): Promise<Assignment | null> {
    const collPath = 'assignments';
    try {
      const snap = await getDoc(doc(db, collPath, assignmentId));
      if (!snap.exists()) return null;
      return snap.data() as Assignment;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `${collPath}/${assignmentId}`);
    }
  },

  async createAssignment(assignment: Assignment): Promise<Assignment> {
    const collPath = 'assignments';
    try {
      await setDoc(doc(db, collPath, assignment.assignmentId), assignment);
      return assignment;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${collPath}/${assignment.assignmentId}`);
    }
  },

  async updateAssignment(assignmentId: string, updates: Partial<Assignment>): Promise<void> {
    const collPath = 'assignments';
    try {
      await updateDoc(doc(db, collPath, assignmentId), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${collPath}/${assignmentId}`);
    }
  },

  async deleteAssignment(assignmentId: string): Promise<void> {
    const collPath = 'assignments';
    try {
      await deleteDoc(doc(db, collPath, assignmentId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collPath}/${assignmentId}`);
    }
  },

  // ===================== SUBMISSIONS =====================
  async getSubmissions(assignmentId?: string): Promise<Submission[]> {
    const collPath = 'submissions';
    try {
      const collRef = collection(db, collPath);
      const q = assignmentId ? query(collRef, where('assignmentId', '==', assignmentId)) : collRef;
      const snap = await getDocs(q);
      if (snap.empty) {
        // Seed initial sample submissions so teacher can immediately mark
        const initialSubs: Submission[] = [
          {
            submissionId: 'sub_asg-sjkc-chinese-grade3-unit1_student-01',
            assignmentId: 'asg-sjkc-chinese-grade3-unit1',
            studentId: 'student-01',
            studentName: '林小明 (Lim Xiao Ming)',
            studentNumber: 'SJKC-3M-01',
            classId: 'class-3-merah',
            schoolId: 'sjkc-yuk-choy',
            status: 'submitted',
            currentVersion: 1,
            submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
            markingStatus: 'pending',
            maximumMarks: 50,
            createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
            updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
          },
          {
            submissionId: 'sub_asg-sjkc-chinese-grade3-unit1_student-02',
            assignmentId: 'asg-sjkc-chinese-grade3-unit1',
            studentId: 'student-02',
            studentName: '黄丽美 (Wong Li Mei)',
            studentNumber: 'SJKC-3M-02',
            classId: 'class-3-merah',
            schoolId: 'sjkc-yuk-choy',
            status: 'in_progress',
            currentVersion: 1,
            markingStatus: 'pending',
            maximumMarks: 50,
            createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
            updatedAt: new Date(Date.now() - 3600000 * 1).toISOString()
          }
        ];
        for (const sub of initialSubs) {
          await setDoc(doc(db, collPath, sub.submissionId), sub);
        }

        // Seed sample student answer for Xiao Ming on Page 1
        const sampleAnswerP1: AnswerPageData = {
          answerId: 'ans_sub_asg-sjkc-chinese-grade3-unit1_student-01_p1',
          submissionId: 'sub_asg-sjkc-chinese-grade3-unit1_student-01',
          pageNumber: 1,
          answerVersion: 1,
          strokes: [
            {
              id: 'str_sample_1',
              color: '#1d4ed8',
              size: 3,
              points: [
                { x: 0.1, y: 0.52 }, { x: 0.12, y: 0.52 }, { x: 0.15, y: 0.522 },
                { x: 0.18, y: 0.525 }, { x: 0.22, y: 0.525 }
              ]
            }
          ],
          typedTexts: [
            {
              id: 'txt_sample_1',
              x: 0.09,
              y: 0.51,
              text: '值日老师在校门前向同学们亲切地问好。',
              fontSize: 15,
              color: '#1d4ed8'
            },
            {
              id: 'txt_sample_2',
              x: 0.09,
              y: 0.63,
              text: '操场上的同学们在精神抖擞地做着早操，草地上回荡着欢声笑语。',
              fontSize: 15,
              color: '#1d4ed8'
            },
            {
              id: 'txt_sample_3',
              x: 0.23,
              y: 0.835,
              text: '亲切',
              fontSize: 15,
              color: '#1d4ed8'
            },
            {
              id: 'txt_sample_4',
              x: 0.23,
              y: 0.875,
              text: '宝贵',
              fontSize: 15,
              color: '#1d4ed8'
            }
          ],
          updatedAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'answers', sampleAnswerP1.answerId), sampleAnswerP1);

        return assignmentId
          ? initialSubs.filter(s => s.assignmentId === assignmentId)
          : initialSubs;
      }
      return snap.docs.map(d => d.data() as Submission);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, collPath);
    }
  },

  async getStudentSubmission(assignmentId: string, studentId: string): Promise<Submission | null> {
    const collPath = 'submissions';
    const subId = `sub_${assignmentId}_${studentId}`;
    try {
      const snap = await getDoc(doc(db, collPath, subId));
      if (!snap.exists()) return null;
      return snap.data() as Submission;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `${collPath}/${subId}`);
    }
  },

  async getOrCreateSubmission(
    assignment: Assignment,
    student: UserProfile
  ): Promise<Submission> {
    const collPath = 'submissions';
    const subId = `sub_${assignment.assignmentId}_${student.uid}`;
    try {
      const snap = await getDoc(doc(db, collPath, subId));
      if (snap.exists()) {
        return snap.data() as Submission;
      }
      const now = new Date().toISOString();
      const newSub: Submission = {
        submissionId: subId,
        assignmentId: assignment.assignmentId,
        studentId: student.uid,
        studentName: student.displayName,
        studentNumber: student.studentId,
        classId: student.classIds?.[0] || assignment.classIds[0] || 'default-class',
        schoolId: assignment.schoolId,
        status: 'in_progress',
        currentVersion: 1,
        markingStatus: 'pending',
        maximumMarks: assignment.maximumMarks,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, collPath, subId), newSub);
      return newSub;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${collPath}/${subId}`);
    }
  },

  async submitWorksheet(submissionId: string): Promise<void> {
    const collPath = 'submissions';
    const now = new Date().toISOString();
    try {
      await updateDoc(doc(db, collPath, submissionId), {
        status: 'submitted',
        submittedAt: now,
        markingStatus: 'pending',
        updatedAt: now,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${collPath}/${submissionId}`);
    }
  },

  // ===================== ANSWER PAGES (DRAWING & TEXT) =====================
  async saveAnswerPage(data: AnswerPageData): Promise<void> {
    const collPath = 'answers';
    const docId = data.answerId;
    
    // Always backup locally first for zero-data-loss offline protection
    try {
      localStorage.setItem(`${DRAFT_PREFIX}${docId}`, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage draft write warning:', e);
    }

    try {
      await setDoc(doc(db, collPath, docId), {
        ...data,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${collPath}/${docId}`);
    }
  },

  async getAnswerPage(submissionId: string, pageNumber: number): Promise<AnswerPageData | null> {
    const collPath = 'answers';
    const docId = `ans_${submissionId}_p${pageNumber}`;

    // Try cloud Firestore first
    try {
      const snap = await getDoc(doc(db, collPath, docId));
      if (snap.exists()) {
        const cloudData = snap.data() as AnswerPageData;
        // Keep local cache synced
        localStorage.setItem(`${DRAFT_PREFIX}${docId}`, JSON.stringify(cloudData));
        return cloudData;
      }
    } catch {
      console.warn(`Firestore read failed for ${docId}, checking local storage fallback.`);
    }

    // Offline / local cache fallback
    try {
      const local = localStorage.getItem(`${DRAFT_PREFIX}${docId}`);
      if (local) {
        return JSON.parse(local) as AnswerPageData;
      }
    } catch {
      // ignore JSON parse error
    }

    return null;
  },

  // ===================== TEACHER MARKING =====================
  async saveMarking(marking: MarkingRecord): Promise<void> {
    const collPath = 'markings';
    try {
      await setDoc(doc(db, collPath, marking.markingId), {
        ...marking,
        updatedAt: new Date().toISOString()
      });

      // Update submission status if released
      if (marking.markingStatus === 'released') {
        const subCollPath = 'submissions';
        await updateDoc(doc(db, subCollPath, marking.submissionId), {
          markingStatus: 'marked',
          totalMarks: marking.totalAwarded,
          resultsReleasedAt: marking.releasedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        const subCollPath = 'submissions';
        await updateDoc(doc(db, subCollPath, marking.submissionId), {
          markingStatus: 'in_progress',
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${collPath}/${marking.markingId}`);
    }
  },

  async getMarking(submissionId: string): Promise<MarkingRecord | null> {
    const collPath = 'markings';
    const docId = `mark_${submissionId}`;
    try {
      const snap = await getDoc(doc(db, collPath, docId));
      if (!snap.exists()) return null;
      return snap.data() as MarkingRecord;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `${collPath}/${docId}`);
    }
  },

  // Listen to submissions in real time
  subscribeToSubmissions(assignmentId: string, callback: (subs: Submission[]) => void) {
    const collRef = collection(db, 'submissions');
    const q = query(collRef, where('assignmentId', '==', assignmentId));
    return onSnapshot(
      q,
      snap => {
        callback(snap.docs.map(d => d.data() as Submission));
      },
      error => {
        handleFirestoreError(error, OperationType.GET, 'submissions');
      }
    );
  }
};
