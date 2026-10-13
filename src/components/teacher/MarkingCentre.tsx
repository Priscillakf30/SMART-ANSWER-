import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Pen,
  Check,
  X as CrossIcon,
  MessageSquare,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Assignment,
  Submission,
  MarkingRecord,
  QuestionScoreItem,
  DrawingStroke,
  TypedTextObject,
  Language,
  TeacherAnnotation
} from '../../types';
import { dbService } from '../../services/dbService';
import { useAuth } from '../../contexts/AuthContext';
import { translations } from '../../utils/translations';

interface MarkingCentreProps {
  assignment: Assignment;
  submission: Submission;
  allSubmissions: Submission[];
  lang: Language;
  onBack: () => void;
  onSelectSubmission: (sub: Submission) => void;
}

export const MarkingCentre: React.FC<MarkingCentreProps> = ({
  assignment,
  submission,
  allSubmissions,
  lang,
  onBack,
  onSelectSubmission
}) => {
  const { currentUser } = useAuth();
  const t = translations[lang];

  // Navigation states
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Student answer layer data for current page
  const [studentStrokes, setStudentStrokes] = useState<DrawingStroke[]>([]);
  const [studentTexts, setStudentTexts] = useState<TypedTextObject[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(true);

  // Teacher marking tools & annotations
  const [activeTool, setActiveTool] = useState<'redPen' | 'check' | 'cross' | 'text'>('redPen');
  const [penThickness, setPenThickness] = useState(3);
  const [annotations, setAnnotations] = useState<Record<number, TeacherAnnotation[]>>({});
  const [undoStack, setUndoStack] = useState<TeacherAnnotation[][]>([]);

  // Question-level scores
  const [questionScores, setQuestionScores] = useState<QuestionScoreItem[]>([]);
  const [overallFeedback, setOverallFeedback] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Canvas refs
  const studentCanvasRef = useRef<HTMLCanvasElement>(null);
  const teacherCanvasRef = useRef<HTMLCanvasElement>(null);
  const isAnnotatingRef = useRef(false);
  const currentAnnotationRef = useRef<TeacherAnnotation | null>(null);

  // Determine current student index among all submissions
  const currentSubIndex = allSubmissions.findIndex(s => s.submissionId === submission.submissionId);

  // Load existing marking record
  useEffect(() => {
    let isMounted = true;
    async function fetchMarking() {
      try {
        const mark = await dbService.getMarking(submission.submissionId);
        if (mark && isMounted) {
          setAnnotations(mark.pageAnnotations || {});
          setQuestionScores(mark.questionScores || []);
          setOverallFeedback(mark.overallFeedback || '');
        } else if (isMounted) {
          // Initialize default questions based on assignment if available
          const defaultQuestions: QuestionScoreItem[] = [
            { questionNumber: '1', maxMarks: Math.round(assignment.maximumMarks * 0.3), marksAwarded: 0, comment: '' },
            { questionNumber: '2', maxMarks: Math.round(assignment.maximumMarks * 0.3), marksAwarded: 0, comment: '' },
            { questionNumber: '3', maxMarks: Math.round(assignment.maximumMarks * 0.4), marksAwarded: 0, comment: '' }
          ];
          setQuestionScores(defaultQuestions);
          setOverallFeedback('');
        }
      } catch (err) {
        console.error('Error fetching marking:', err);
      }
    }
    fetchMarking();
    return () => { isMounted = false; };
  }, [submission.submissionId, assignment.maximumMarks]);

  // Load student answers for the current page
  useEffect(() => {
    let isMounted = true;
    setLoadingAnswers(true);
    async function fetchAnswers() {
      try {
        const ans = await dbService.getAnswerPage(submission.submissionId, currentPage);
        if (isMounted) {
          setStudentStrokes(ans?.strokes || []);
          setStudentTexts(ans?.typedTexts || []);
          setLoadingAnswers(false);
        }
      } catch {
        if (isMounted) setLoadingAnswers(false);
      }
    }
    fetchAnswers();
    return () => { isMounted = false; };
  }, [submission.submissionId, currentPage]);

  // Draw student answer layer (BLUE/BLACK strokes)
  const drawStudentAnswers = useCallback(() => {
    const canvas = studentCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of studentStrokes) {
      if (stroke.points.length < 1) continue;
      ctx.save();
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.size;
      ctx.strokeStyle = stroke.color;

      const p0 = stroke.points[0];
      ctx.moveTo(p0.x * canvas.width, p0.y * canvas.height);
      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
      }
      ctx.stroke();
      ctx.restore();
    }
  }, [studentStrokes]);

  // Draw teacher annotation layer (RED marks, ticks, crosses)
  const drawTeacherAnnotations = useCallback(() => {
    const canvas = teacherCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pageAnnots = annotations[currentPage] || [];

    for (const ann of pageAnnots) {
      ctx.save();
      if (ann.type === 'pen' && ann.points && ann.points.length > 0) {
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = ann.size;
        ctx.strokeStyle = ann.color;

        const p0 = ann.points[0];
        ctx.moveTo(p0.x * canvas.width, p0.y * canvas.height);
        for (let i = 1; i < ann.points.length; i++) {
          const pt = ann.points[i];
          ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
        }
        ctx.stroke();
      } else if (ann.type === 'check' && ann.x !== undefined && ann.y !== undefined) {
        // Draw teacher tick mark ✔
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#dc2626';
        ctx.lineCap = 'round';
        ctx.beginPath();
        const cx = ann.x * canvas.width;
        const cy = ann.y * canvas.height;
        ctx.moveTo(cx - 10, cy);
        ctx.lineTo(cx - 3, cy + 8);
        ctx.lineTo(cx + 14, cy - 12);
        ctx.stroke();
      } else if (ann.type === 'cross' && ann.x !== undefined && ann.y !== undefined) {
        // Draw teacher cross mark ✘
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#dc2626';
        ctx.lineCap = 'round';
        ctx.beginPath();
        const cx = ann.x * canvas.width;
        const cy = ann.y * canvas.height;
        ctx.moveTo(cx - 8, cy - 8);
        ctx.lineTo(cx + 8, cy + 8);
        ctx.moveTo(cx + 8, cy - 8);
        ctx.lineTo(cx - 8, cy + 8);
        ctx.stroke();
      } else if (ann.type === 'text' && ann.x !== undefined && ann.y !== undefined && ann.text) {
        ctx.font = 'bold 16px "PingFang SC", sans-serif';
        ctx.fillStyle = '#dc2626';
        ctx.fillText(ann.text, ann.x * canvas.width, ann.y * canvas.height);
      }
      ctx.restore();
    }
  }, [annotations, currentPage]);

  // Adjust canvas sizes
  useEffect(() => {
    const sCanvas = studentCanvasRef.current;
    const tCanvas = teacherCanvasRef.current;
    if (sCanvas && tCanvas) {
      const rect = sCanvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        sCanvas.width = rect.width;
        sCanvas.height = rect.height;
        tCanvas.width = rect.width;
        tCanvas.height = rect.height;
        drawStudentAnswers();
        drawTeacherAnnotations();
      }
    }
  }, [drawStudentAnswers, drawTeacherAnnotations, zoomLevel, currentPage]);

  useEffect(() => {
    drawStudentAnswers();
  }, [drawStudentAnswers]);

  useEffect(() => {
    drawTeacherAnnotations();
  }, [drawTeacherAnnotations]);

  // Teacher drawing on annotation layer
  const handleTeacherPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = teacherCanvasRef.current;
    if (!canvas) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;

    const currentPageAnnots = annotations[currentPage] || [];
    setUndoStack(prev => [...prev, currentPageAnnots]);

    if (activeTool === 'check' || activeTool === 'cross') {
      const stamp: TeacherAnnotation = {
        id: `ann_${Date.now()}`,
        type: activeTool,
        color: '#dc2626',
        size: 3,
        x: nx,
        y: ny
      };
      setAnnotations(prev => ({
        ...prev,
        [currentPage]: [...currentPageAnnots, stamp]
      }));
      setHasUnsavedChanges(true);
      return;
    }

    if (activeTool === 'text') {
      const comment = prompt('输入批改备注或评语：');
      if (comment) {
        const textAnn: TeacherAnnotation = {
          id: `ann_${Date.now()}`,
          type: 'text',
          color: '#dc2626',
          size: 16,
          x: nx,
          y: ny,
          text: comment
        };
        setAnnotations(prev => ({
          ...prev,
          [currentPage]: [...currentPageAnnots, textAnn]
        }));
        setHasUnsavedChanges(true);
      }
      return;
    }

    // Red pen freehand drawing
    isAnnotatingRef.current = true;
    const newAnnot: TeacherAnnotation = {
      id: `ann_${Date.now()}`,
      type: 'pen',
      color: '#dc2626',
      size: penThickness,
      points: [{ x: nx, y: ny }]
    };
    currentAnnotationRef.current = newAnnot;

    setAnnotations(prev => ({
      ...prev,
      [currentPage]: [...currentPageAnnots, newAnnot]
    }));
    setHasUnsavedChanges(true);
  };

  const handleTeacherPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isAnnotatingRef.current || !currentAnnotationRef.current) return;
    const canvas = teacherCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    currentAnnotationRef.current.points?.push({ x: nx, y: ny });

    setAnnotations(prev => {
      const pageAnnots = [...(prev[currentPage] || [])];
      pageAnnots[pageAnnots.length - 1] = { ...currentAnnotationRef.current! };
      return { ...prev, [currentPage]: pageAnnots };
    });
  };

  const handleTeacherPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isAnnotatingRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    isAnnotatingRef.current = false;
    currentAnnotationRef.current = null;
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(old => old.slice(0, old.length - 1));
    setAnnotations(all => ({ ...all, [currentPage]: prev }));
    setHasUnsavedChanges(true);
  };

  // Score calculations and updates
  const handleScoreChange = (index: number, val: string) => {
    const num = Math.max(0, parseFloat(val) || 0);
    const updated = [...questionScores];
    const max = updated[index].maxMarks;
    updated[index].marksAwarded = Math.min(num, max);
    setQuestionScores(updated);
    setHasUnsavedChanges(true);
  };

  const handleAddQuestion = () => {
    const nextNum = (questionScores.length + 1).toString();
    setQuestionScores(prev => [
      ...prev,
      { questionNumber: nextNum, maxMarks: 10, marksAwarded: 0, comment: '' }
    ]);
    setHasUnsavedChanges(true);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestionScores(prev => prev.filter((_, i) => i !== idx));
    setHasUnsavedChanges(true);
  };

  const currentTotalAwarded = questionScores.reduce((sum, q) => sum + (q.marksAwarded || 0), 0);

  // Save marking draft
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const record: MarkingRecord = {
        markingId: `mark_${submission.submissionId}`,
        submissionId: submission.submissionId,
        teacherId: currentUser?.uid || 'teacher-01',
        teacherName: currentUser?.displayName || '陈老师',
        pageAnnotations: annotations,
        questionScores,
        overallFeedback,
        markingStatus: 'draft',
        totalAwarded: currentTotalAwarded,
        maximumMarks: assignment.maximumMarks,
        updatedAt: new Date().toISOString()
      };
      await dbService.saveMarking(record);
      setHasUnsavedChanges(false);
      setSavingDraft(false);
    } catch (err) {
      console.error('Save marking draft failed:', err);
      alert('保存批改草稿失败，请重试。');
      setSavingDraft(false);
    }
  };

  // Final Release of Marks & Feedback
  const handleReleaseMarks = async () => {
    if (currentTotalAwarded > assignment.maximumMarks) {
      alert(`批改总分 (${currentTotalAwarded}) 超过了作业满分 (${assignment.maximumMarks})，请核对后再发布！`);
      return;
    }
    setReleasing(true);
    try {
      const record: MarkingRecord = {
        markingId: `mark_${submission.submissionId}`,
        submissionId: submission.submissionId,
        teacherId: currentUser?.uid || 'teacher-01',
        teacherName: currentUser?.displayName || '陈老师',
        pageAnnotations: annotations,
        questionScores,
        overallFeedback,
        markingStatus: 'released',
        totalAwarded: currentTotalAwarded,
        maximumMarks: assignment.maximumMarks,
        updatedAt: new Date().toISOString(),
        releasedAt: new Date().toISOString()
      };
      await dbService.saveMarking(record);

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.5 }
      });

      setHasUnsavedChanges(false);
      setReleasing(false);
      alert(`成绩与评语已正式发布！学生 ${submission.studentName} 现在可在其界面查看得分 (${currentTotalAwarded}/${assignment.maximumMarks}) 与批改手迹。`);
    } catch (err) {
      console.error('Release marks failed:', err);
      alert('公布成绩失败，请重试。');
      setReleasing(false);
    }
  };

  // Switch student
  const navigateStudent = (dir: -1 | 1) => {
    if (hasUnsavedChanges) {
      const proceed = confirm('您有未保存的批改草稿，切换前是否保存？点击确定继续切换，点击取消先保存。');
      if (!proceed) return;
    }
    const targetIdx = currentSubIndex + dir;
    if (targetIdx >= 0 && targetIdx < allSubmissions.length) {
      onSelectSubmission(allSubmissions[targetIdx]);
    }
  };

  const currentWorksheetUrl = assignment.worksheetPages[currentPage - 1] || assignment.worksheetPages[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 text-slate-100 select-none overflow-hidden">
      {/* Top Header: Student info, Back button, Next/Prev student */}
      <header className="h-14 bg-slate-800 border-b border-slate-700 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.marking.backToList}</span>
          </button>

          <div className="border-l border-slate-700 pl-3">
            <h1 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
              <span>正在批改：{submission.studentName}</span>
              <span className="text-xs font-normal text-slate-400">
                ({submission.studentNumber || '学号'})
              </span>
              {submission.markingStatus === 'marked' && (
                <span className="bg-emerald-950 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-700 font-normal">
                  已公布 ({submission.totalMarks}/{assignment.maximumMarks}分)
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Student Switcher & Save / Release Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-700/80 rounded-lg p-0.5 text-xs text-slate-300">
            <button
              onClick={() => navigateStudent(-1)}
              disabled={currentSubIndex <= 0}
              className="px-2 py-1 hover:text-white disabled:opacity-30 transition flex items-center gap-1"
              title={t.marking.prevStudent}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden md:inline">上一位</span>
            </button>
            <span className="px-2 font-mono text-slate-400 border-x border-slate-600">
              {currentSubIndex + 1} / {allSubmissions.length}
            </span>
            <button
              onClick={() => navigateStudent(1)}
              disabled={currentSubIndex >= allSubmissions.length - 1}
              className="px-2 py-1 hover:text-white disabled:opacity-30 transition flex items-center gap-1"
              title={t.marking.nextStudent}
            >
              <span className="hidden md:inline">下一位</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-lg transition"
          >
            {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">保存草稿</span>
          </button>

          <button
            onClick={handleReleaseMarks}
            disabled={releasing}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs md:text-sm font-semibold px-3 md:px-4 py-1.5 rounded-lg shadow-md transition"
          >
            {releasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>公布成绩与批改</span>
          </button>
        </div>
      </header>

      {/* Main Layout: Left/Center Worksheet View + Right Scoring Panel */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Toolbar for Marking Tools */}
        <aside className="bg-slate-800 border-b lg:border-b-0 lg:border-r border-slate-700 p-2 lg:p-3 flex lg:flex-col items-center gap-2 lg:gap-4 shrink-0 overflow-x-auto z-10">
          <div className="flex lg:flex-col items-center gap-1.5">
            <button
              onClick={() => setActiveTool('redPen')}
              className={`p-2 rounded-lg transition flex items-center justify-center ${
                activeTool === 'redPen'
                  ? 'bg-rose-600 text-white shadow ring-2 ring-rose-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              title={t.marking.tools.redPen}
            >
              <Pen className="w-5 h-5 text-rose-300" />
            </button>

            <button
              onClick={() => setActiveTool('check')}
              className={`p-2 rounded-lg transition flex items-center justify-center ${
                activeTool === 'check'
                  ? 'bg-rose-600 text-white shadow ring-2 ring-rose-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              title={t.marking.tools.checkMark}
            >
              <Check className="w-5 h-5 text-rose-400" />
            </button>

            <button
              onClick={() => setActiveTool('cross')}
              className={`p-2 rounded-lg transition flex items-center justify-center ${
                activeTool === 'cross'
                  ? 'bg-rose-600 text-white shadow ring-2 ring-rose-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              title={t.marking.tools.crossMark}
            >
              <CrossIcon className="w-5 h-5 text-rose-400" />
            </button>

            <button
              onClick={() => setActiveTool('text')}
              className={`p-2 rounded-lg transition flex items-center justify-center ${
                activeTool === 'text'
                  ? 'bg-rose-600 text-white shadow ring-2 ring-rose-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              title={t.marking.tools.comment}
            >
              <MessageSquare className="w-5 h-5 text-rose-300" />
            </button>
          </div>

          <div className="h-6 w-px lg:h-px lg:w-8 bg-slate-700" />

          {/* Pen thickness */}
          <div className="hidden lg:flex flex-col items-center gap-1">
            {[2, 4, 6].map(px => (
              <button
                key={px}
                onClick={() => setPenThickness(px)}
                className={`text-xs px-2 py-0.5 rounded transition ${
                  penThickness === px ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {px}px
              </button>
            ))}
          </div>

          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30"
            title="撤销上一笔批改"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </aside>

        {/* Center: The Multi-Layer Canvas Area */}
        <div className="flex-1 overflow-auto bg-slate-950 p-3 md:p-6 flex items-center justify-center relative touch-pan-x touch-pan-y">
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out'
            }}
            className="relative bg-white shadow-2xl rounded-sm max-w-full"
          >
            {/* Layer 1: The Original SJKC Worksheet (Background) */}
            <img
              src={currentWorksheetUrl}
              alt={`Page ${currentPage}`}
              className="w-full max-w-[850px] object-contain pointer-events-none select-none block"
              draggable={false}
            />

            {/* Layer 2: Student Handwriting Canvas (Read-Only) */}
            <canvas
              ref={studentCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* Layer 3: Student Typed Text Objects */}
            <div className="absolute inset-0 pointer-events-none">
              {studentTexts.map(tObj => (
                <div
                  key={tObj.id}
                  style={{
                    position: 'absolute',
                    left: `${tObj.x * 100}%`,
                    top: `${tObj.y * 100}%`,
                    color: tObj.color,
                    fontSize: `${tObj.fontSize}px`
                  }}
                  className="font-medium bg-blue-50/70 border border-blue-200 rounded px-1.5 py-0.5 shadow-sm text-sm"
                >
                  {tObj.text}
                </div>
              ))}
            </div>

            {/* Layer 4: Teacher Annotations Layer (Interactive Red Pen, Stamps, Comments) */}
            <canvas
              ref={teacherCanvasRef}
              onPointerDown={handleTeacherPointerDown}
              onPointerMove={handleTeacherPointerMove}
              onPointerUp={handleTeacherPointerUp}
              onPointerCancel={handleTeacherPointerUp}
              style={{ touchAction: 'none' }}
              className="absolute inset-0 w-full h-full cursor-crosshair"
            />
          </div>

          {loadingAnswers && (
            <div className="absolute top-4 right-4 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs text-sky-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>载入学生作答...</span>
            </div>
          )}
        </div>

        {/* Right Side Panel: Scoring & Feedback */}
        <aside className="w-full lg:w-80 xl:w-96 bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-700 flex flex-col shrink-0 overflow-y-auto max-h-[45vh] lg:max-h-none">
          {/* Section: Question-by-Question Scoring */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>分题评分与满分核算</span>
              </h2>
              <button
                onClick={handleAddQuestion}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium"
              >
                + 添加分题
              </button>
            </div>

            <div className="space-y-2.5">
              {questionScores.map((q, idx) => (
                <div key={idx} className="bg-slate-900/70 border border-slate-700/80 rounded-lg p-2.5 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-slate-200">
                      题目 {q.questionNumber}
                    </span>
                    <button
                      onClick={() => handleRemoveQuestion(idx)}
                      className="text-slate-500 hover:text-rose-400 text-[10px]"
                    >
                      删除
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 block mb-0.5">得分</label>
                      <input
                        type="number"
                        min="0"
                        max={q.maxMarks}
                        value={q.marksAwarded}
                        onChange={e => handleScoreChange(idx, e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <span className="text-slate-500 pt-3">/</span>
                    <div className="w-20">
                      <label className="text-[10px] text-slate-400 block mb-0.5">分题满分</label>
                      <input
                        type="number"
                        min="1"
                        value={q.maxMarks}
                        onChange={e => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          const updated = [...questionScores];
                          updated[idx].maxMarks = val;
                          setQuestionScores(updated);
                        }}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total score summary */}
            <div className="mt-4 p-3 rounded-lg bg-slate-900 border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">合计总分</span>
                <span className="text-xs text-slate-400">作业满分：{assignment.maximumMarks} 分</span>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-black ${
                  currentTotalAwarded > assignment.maximumMarks ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {currentTotalAwarded}
                </span>
                <span className="text-sm text-slate-400"> / {assignment.maximumMarks}</span>
              </div>
            </div>
          </div>

          {/* Section: Teacher Overall Feedback */}
          <div className="p-4 flex-1 flex flex-col">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <span>教师综合评语与指导意见</span>
            </h3>
            <textarea
              value={overallFeedback}
              onChange={e => {
                setOverallFeedback(e.target.value);
                setHasUnsavedChanges(true);
              }}
              rows={4}
              placeholder="为学生写下鼓励、订正指引或答题亮点（例如：字体端正，第三题运算步骤清晰，继续保持！）..."
              className="w-full flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
            />

            <div className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-400">
              <Info className="w-3.5 h-3.5 shrink-0 text-slate-500 mt-0.5" />
              <span>成绩公布后，学生将收到通知并在其作业界面直接查看红笔批改与评语。</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Bar: Page Navigation & Zoom */}
      <footer className="h-12 bg-slate-800 border-t border-slate-700 px-4 flex items-center justify-between shrink-0 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-white px-2.5 py-1 rounded disabled:opacity-30 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>上一页</span>
          </button>
          <span className="font-semibold px-2 py-0.5 bg-slate-900 rounded border border-slate-700">
            {currentPage} / {assignment.pageCount}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(assignment.pageCount, p + 1))}
            disabled={currentPage >= assignment.pageCount}
            className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-white px-2.5 py-1 rounded disabled:opacity-30 transition"
          >
            <span>下一页</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.15))}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="w-10 text-center font-mono">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel(prev => Math.min(1.8, prev + 0.15))}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};
