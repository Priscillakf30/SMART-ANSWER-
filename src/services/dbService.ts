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

// Local storage key prefix for offline draft resilience
const DRAFT_PREFIX = 'smart_answer_draft_';

export const dbService = {
  // ===================== CLASSES =====================
  async getClasses(): Promise<SchoolClass[]> {
    const collPath = 'classes';
    try {
      const snap = await getDocs(collection(db, collPath));
      if (snap.empty) {
        return [];
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

  async deleteClass(classId: string): Promise<void> {
    const collPath = 'classes';
    try {
      await deleteDoc(doc(db, collPath, classId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collPath}/${classId}`);
    }
  },

  // ===================== STUDENTS & USERS =====================
  async getStudentsByClass(classId?: string): Promise<UserProfile[]> {
    const collPath = 'users';
    try {
      const snap = await getDocs(collection(db, collPath));
      if (snap.empty) {
        return [];
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
        return [];
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
        return [];
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
  },

  // ===================== CLEAN / RESET ALL DATA =====================
  async clearAllData(): Promise<void> {
    const collectionsToClear = ['assignments', 'submissions', 'answers', 'markings', 'classes', 'users'];
    for (const c of collectionsToClear) {
      try {
        const snap = await getDocs(collection(db, c));
        for (const docItem of snap.docs) {
          await deleteDoc(doc(db, c, docItem.id));
        }
      } catch (err) {
        console.error(`Failed to clear ${c}:`, err);
      }
    }
    // Also clear localStorage drafts
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(DRAFT_PREFIX) || key === 'smart_answer_active_user')) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // ignore
    }
  }
};
