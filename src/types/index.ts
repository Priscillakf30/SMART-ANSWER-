export type UserRole = 'student' | 'teacher' | 'admin';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  studentId?: string;
  teacherId?: string;
  schoolId?: string;
  classIds?: string[];
  accountStatus?: 'active' | 'suspended';
  createdAt?: string;
  updatedAt?: string;
}

export interface SchoolClass {
  classId: string;
  schoolId: string;
  className: string;      // e.g. "3 红班 (3 Merah)", "4 蓝班 (4 Biru)"
  gradeLevel: string;     // e.g. "三年级 / Standard 3"
  academicYear: string;   // e.g. "2026"
  teacherIds: string[];
  studentIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Assignment {
  assignmentId: string;
  schoolId: string;
  teacherId: string;
  teacherName?: string;
  classIds: string[];
  title: string;
  subject: string;        // 华文, 国文, 英文, 数学, 科学, 历史
  gradeLevel: string;     // 一年级 to 六年级
  instructions: string;
  worksheetPages: string[]; // URLs or base64 data URLs for each page
  worksheetFileName: string;
  worksheetFileType: 'pdf' | 'image';
  pageCount: number;
  maximumMarks: number;
  deadline: string;       // ISO timestamp
  status: 'draft' | 'published' | 'closed';
  allowResubmission: boolean;
  feedbackReleaseSettings: 'immediate' | 'manual' | 'after_deadline';
  createdAt: string;
  publishedAt?: string;
  updatedAt: string;
}

export type SubmissionStatus = 'not_started' | 'in_progress' | 'submitted' | 'returned';
export type MarkingStatus = 'pending' | 'in_progress' | 'marked';

export interface Submission {
  submissionId: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentNumber?: string;
  classId: string;
  schoolId: string;
  status: SubmissionStatus;
  currentVersion: number;
  submittedAt?: string;
  lastCloudSyncAt?: string;
  markingStatus: MarkingStatus;
  totalMarks?: number;
  maximumMarks: number;
  resultsReleasedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DrawingPoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface DrawingStroke {
  id: string;
  color: string;
  size: number;
  points: DrawingPoint[];
  isEraser?: boolean;
}

export interface TypedTextObject {
  id: string;
  x: number; // percentage or normalized coordinate (0 to 1) for responsive scaling
  y: number;
  text: string;
  fontSize: number;
  color: string;
  fontFamily?: string;
}

export interface AnswerPageData {
  answerId: string;
  submissionId: string;
  pageNumber: number;
  answerVersion: number;
  strokes: DrawingStroke[];
  typedTexts: TypedTextObject[];
  updatedAt: string;
}

export interface QuestionScoreItem {
  questionNumber: string; // e.g. "1(a)", "2", "3"
  maxMarks: number;
  marksAwarded: number;
  comment?: string;
}

export interface TeacherAnnotation {
  id: string;
  type: 'pen' | 'check' | 'cross' | 'text' | 'highlight';
  color: string;
  size: number;
  points?: DrawingPoint[];
  x?: number;
  y?: number;
  text?: string;
}

export interface MarkingRecord {
  markingId: string;
  submissionId: string;
  teacherId: string;
  teacherName?: string;
  pageAnnotations: Record<number, TeacherAnnotation[]>; // pageNumber -> annotations
  questionScores: QuestionScoreItem[];
  overallFeedback: string;
  markingStatus: 'draft' | 'released';
  totalAwarded: number;
  maximumMarks: number;
  updatedAt: string;
  releasedAt?: string;
}

export type SyncStatus = 
  | 'unsaved'
  | 'saving'
  | 'saved_local'
  | 'synced_cloud'
  | 'offline_waiting'
  | 'sync_failed';

export type Language = 'zh' | 'ms' | 'en';
