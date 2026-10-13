import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Pen,
  Eraser,
  Type,
  RotateCcw,
  RotateCw,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Save,
  Send,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  CloudCheck,
  CloudOff,
  Loader2,
  X,
  FileSignature
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Assignment,
  Submission,
  DrawingStroke,
  DrawingPoint,
  TypedTextObject,
  SyncStatus,
  Language
} from '../../types';
import { dbService } from '../../services/dbService';
import { useAuth } from '../../contexts/AuthContext';
import { translations } from '../../utils/translations';
import { HandwritingPadModal } from './HandwritingPadModal';

interface DigitalWorksheetEditorProps {
  assignment: Assignment;
  submission: Submission;
  initialPage?: number;
  lang: Language;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

const PEN_COLORS = [
  { name: '黑笔 (Black)', hex: '#0f172a' },
  { name: '蓝笔 (Blue)', hex: '#1d4ed8' },
  { name: '红笔 (Red)', hex: '#dc2626' }
];

const PEN_SIZES = [
  { label: '细 2px', size: 2 },
  { label: '中 4px', size: 4 },
  { label: '粗 8px', size: 8 }
];

export const DigitalWorksheetEditor: React.FC<DigitalWorksheetEditorProps> = ({
  assignment,
  submission,
  initialPage = 1,
  lang,
  onClose,
  onSubmitSuccess
}) => {
  const { currentUser } = useAuth();
  const t = translations[lang];

  // Editor states
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser' | 'text'>('pen');
  const [selectedColor, setSelectedColor] = useState(PEN_COLORS[0].hex);
  const [selectedSize, setSelectedSize] = useState(4);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced_cloud');

  // Drawing state per page
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [undoStack, setUndoStack] = useState<DrawingStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingStroke[][]>([]);
  const [typedTexts, setTypedTexts] = useState<TypedTextObject[]>([]);

  // Active text editing state
  const [activeTextId, setActiveTextId] = useState<string | null>(null);

  // Modals
  const [showClearModal, setShowClearModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Canvas refs
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<DrawingStroke | null>(null);
  const autoSaveTimerRef = useRef<any>(null);

  // Load page answer data on mount or page switch
  const loadPageData = useCallback(async (page: number) => {
    try {
      const data = await dbService.getAnswerPage(submission.submissionId, page);
      if (data) {
        setStrokes(data.strokes || []);
        setTypedTexts(data.typedTexts || []);
      } else {
        setStrokes([]);
        setTypedTexts([]);
      }
      setUndoStack([]);
      setRedoStack([]);
      setSyncStatus('synced_cloud');
    } catch {
      setSyncStatus('offline_waiting');
    }
  }, [submission.submissionId]);

  useEffect(() => {
    loadPageData(currentPage);
  }, [currentPage, loadPageData]);

  // Redraw canvas whenever strokes change or size updates
  const redrawCanvas = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render strokes with quadratic curve smoothing
    for (const stroke of strokes) {
      if (stroke.points.length < 1) continue;

      ctx.save();
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.size;
      ctx.strokeStyle = stroke.color;

      if (stroke.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      const p0 = stroke.points[0];
      const startX = p0.x * canvas.width;
      const startY = p0.y * canvas.height;

      if (stroke.points.length === 1) {
        ctx.arc(startX, startY, stroke.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
        ctx.restore();
        continue;
      }

      ctx.moveTo(startX, startY);

      for (let i = 1; i < stroke.points.length - 1; i++) {
        const ptA = stroke.points[i];
        const ptB = stroke.points[i + 1];
        const ax = ptA.x * canvas.width;
        const ay = ptA.y * canvas.height;
        const bx = ptB.x * canvas.width;
        const by = ptB.y * canvas.height;
        const midX = (ax + bx) / 2;
        const midY = (ay + by) / 2;
        ctx.quadraticCurveTo(ax, ay, midX, midY);
      }

      const last = stroke.points[stroke.points.length - 1];
      ctx.lineTo(last.x * canvas.width, last.y * canvas.height);

      ctx.stroke();
      ctx.restore();
    }
  }, [strokes]);

  // Sync canvas dimensions with parent container
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    // Use standard high-DPI canvas
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width;
      canvas.height = rect.height;
      redrawCanvas();
    }
  }, [redrawCanvas, zoomLevel]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Debounced Autosave function
  const triggerAutoSave = useCallback((updatedStrokes: DrawingStroke[], updatedTexts: TypedTextObject[]) => {
    setSyncStatus('unsaved');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      setSyncStatus('saving');
      try {
        const answerDoc = {
          answerId: `ans_${submission.submissionId}_p${currentPage}`,
          submissionId: submission.submissionId,
          pageNumber: currentPage,
          answerVersion: 1,
          strokes: updatedStrokes,
          typedTexts: updatedTexts,
          updatedAt: new Date().toISOString()
        };
        await dbService.saveAnswerPage(answerDoc);
        setSyncStatus('synced_cloud');
      } catch {
        setSyncStatus('saved_local');
      }
    }, 1200); // 1.2s debounce
  }, [currentPage, submission.submissionId]);

  // Pointer event handlers for drawing (Supports finger touch, stylus, mouse)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (submission.status === 'submitted') return; // Read-only if already submitted
    if (activeTool === 'text') {
      handleCanvasClickForText(e);
      return;
    }

    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    // Prevent default touch behaviors like gestures
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;

    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;

    const newStroke: DrawingStroke = {
      id: `str_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      color: activeTool === 'eraser' ? '#ffffff' : selectedColor,
      size: activeTool === 'eraser' ? selectedSize * 3 : selectedSize,
      isEraser: activeTool === 'eraser',
      points: [{ x: nx, y: ny, pressure: e.pressure || 0.5 }]
    };

    currentStrokeRef.current = newStroke;

    // Save previous state for undo
    setUndoStack(prev => [...prev, strokes]);
    setRedoStack([]);

    setStrokes(prev => [...prev, newStroke]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    currentStrokeRef.current.points.push({ x: nx, y: ny, pressure: e.pressure || 0.5 });

    // Live update strokes
    setStrokes(prev => {
      const next = [...prev];
      next[next.length - 1] = { ...currentStrokeRef.current! };
      return next;
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    isDrawingRef.current = false;
    currentStrokeRef.current = null;

    triggerAutoSave(strokes, typedTexts);
  };

  // Text Answer Tool: Clicking to add text
  const handleCanvasClickForText = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;

    const newText: TypedTextObject = {
      id: `txt_${Date.now()}`,
      x: nx,
      y: ny,
      text: '',
      fontSize: 16,
      color: selectedColor
    };

    setTypedTexts(prev => [...prev, newText]);
    setActiveTextId(newText.id);
    triggerAutoSave(strokes, [...typedTexts, newText]);
  };

  const handleUpdateTextContent = (id: string, text: string) => {
    const updated = typedTexts.map(t => t.id === id ? { ...t, text } : t);
    setTypedTexts(updated);
    triggerAutoSave(strokes, updated);
  };

  const handleDeleteText = (id: string) => {
    const updated = typedTexts.filter(t => t.id !== id);
    setTypedTexts(updated);
    if (activeTextId === id) setActiveTextId(null);
    triggerAutoSave(strokes, updated);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, strokes]);
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    setStrokes(previous);
    triggerAutoSave(previous, typedTexts);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, strokes]);
    setRedoStack(prev => prev.slice(0, prev.length - 1));
    setStrokes(next);
    triggerAutoSave(next, typedTexts);
  };

  // Clear current page
  const handleClearPage = () => {
    setUndoStack(prev => [...prev, strokes]);
    setStrokes([]);
    setTypedTexts([]);
    setShowClearModal(false);
    triggerAutoSave([], []);
  };

  // Page navigation
  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > assignment.pageCount) return;
    // Force immediate save of current page before switching
    try {
      await dbService.saveAnswerPage({
        answerId: `ans_${submission.submissionId}_p${currentPage}`,
        submissionId: submission.submissionId,
        pageNumber: currentPage,
        answerVersion: 1,
        strokes,
        typedTexts,
        updatedAt: new Date().toISOString()
      });
    } catch {
      // continue
    }
    setCurrentPage(newPage);
  };

  // Submit flow
  const handleFormalSubmit = async () => {
    setSubmitting(true);
    try {
      // 1. Ensure current page is saved
      await dbService.saveAnswerPage({
        answerId: `ans_${submission.submissionId}_p${currentPage}`,
        submissionId: submission.submissionId,
        pageNumber: currentPage,
        answerVersion: 1,
        strokes,
        typedTexts,
        updatedAt: new Date().toISOString()
      });

      // 2. Submit to server
      await dbService.submitWorksheet(submission.submissionId);

      // 3. Fire celebration confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      setSubmitting(false);
      setShowSubmitModal(false);
      onSubmitSuccess();
    } catch (err) {
      console.error('Submission failed:', err);
      alert('提交作业失败，请检查网络后重试。');
      setSubmitting(false);
    }
  };

  // Background image URL for current page
  const currentWorksheetUrl = assignment.worksheetPages[currentPage - 1] || assignment.worksheetPages[0];
  const isSubmitted = submission.status === 'submitted';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 text-slate-100 select-none overflow-hidden">
      {/* Top Bar: Assignment Title, Page Info, Sync Status, Close */}
      <header className="h-14 bg-slate-800 border-b border-slate-700 px-3 md:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 truncate">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
            title="退出答题卷"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="truncate">
            <h1 className="text-sm md:text-base font-bold text-white truncate">
              {assignment.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="bg-sky-950 text-sky-400 px-1.5 py-0.5 rounded border border-sky-800">
                {assignment.subject}
              </span>
              <span>{assignment.gradeLevel}</span>
              {isSubmitted && (
                <span className="bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-700">
                  已正式提交 (已封存)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sync Status Badge & Action Buttons */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {/* Cloud Sync Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-700/60 border border-slate-600">
            {syncStatus === 'synced_cloud' && (
              <>
                <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{t.editor.saveStatus.synced_cloud}</span>
              </>
            )}
            {syncStatus === 'saving' && (
              <>
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="text-amber-400">{t.editor.saveStatus.saving}</span>
              </>
            )}
            {syncStatus === 'unsaved' && (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-amber-300">{t.editor.saveStatus.unsaved}</span>
              </>
            )}
            {syncStatus === 'saved_local' && (
              <>
                <Save className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-sky-300">{t.editor.saveStatus.saved_local}</span>
              </>
            )}
            {syncStatus === 'offline_waiting' && (
              <>
                <CloudOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400">{t.editor.saveStatus.offline_waiting}</span>
              </>
            )}
          </div>

          {!isSubmitted && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs md:text-sm px-3 md:px-4 py-1.5 rounded-lg shadow-md transition"
            >
              <Send className="w-4 h-4" />
              <span>{t.editor.submitBtn}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace (Toolbar on Top/Side + Center Worksheet Area) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Interactive Floating / Responsive Toolbar */}
        {!isSubmitted && (
          <aside className="bg-slate-800 border-b md:border-b-0 md:border-r border-slate-700 p-2 md:p-3 flex md:flex-col items-center justify-between md:justify-start gap-2 md:gap-4 shrink-0 overflow-x-auto z-10">
            {/* Tool Selection (Pen, Eraser, Text) */}
            <div className="flex md:flex-col items-center gap-1.5">
              <button
                onClick={() => setActiveTool('pen')}
                className={`p-2 rounded-lg transition flex items-center justify-center ${
                  activeTool === 'pen'
                    ? 'bg-sky-600 text-white shadow-lg ring-2 ring-sky-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
                title={t.editor.penBlack}
              >
                <Pen className="w-5 h-5" />
              </button>

              <button
                onClick={() => setActiveTool('eraser')}
                className={`p-2 rounded-lg transition flex items-center justify-center ${
                  activeTool === 'eraser'
                    ? 'bg-amber-600 text-white shadow-lg ring-2 ring-amber-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
                title={t.editor.eraser}
              >
                <Eraser className="w-5 h-5" />
              </button>

              <button
                onClick={() => setActiveTool('text')}
                className={`p-2 rounded-lg transition flex items-center justify-center ${
                  activeTool === 'text'
                    ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
                title={t.editor.textTool}
              >
                <Type className="w-5 h-5" />
              </button>
            </div>

            <div className="h-6 w-px md:h-px md:w-8 bg-slate-700" />

            {/* Pen Color Palette */}
            {activeTool === 'pen' && (
              <div className="flex md:flex-col items-center gap-2">
                {PEN_COLORS.map(c => (
                  <button
                    key={c.hex}
                    onClick={() => setSelectedColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-6 h-6 rounded-full border-2 transition ${
                      selectedColor === c.hex ? 'border-white scale-110 shadow' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            )}

            {/* Thickness selector */}
            <div className="hidden md:flex flex-col items-center gap-1.5">
              {PEN_SIZES.map(s => (
                <button
                  key={s.size}
                  onClick={() => setSelectedSize(s.size)}
                  className={`text-xs px-2 py-0.5 rounded transition ${
                    selectedSize === s.size ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="h-6 w-px md:h-px md:w-8 bg-slate-700" />

            {/* Undo / Redo / Clear */}
            <div className="flex md:flex-col items-center gap-1">
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                title={t.editor.undo}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                title={t.editor.redo}
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowClearModal(true)}
                className="p-1.5 rounded text-rose-400 hover:text-rose-200 hover:bg-rose-950/50"
                title={t.editor.clearPage}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowScratchpad(true)}
                className="p-1.5 rounded text-amber-300 hover:text-amber-100 hover:bg-amber-950/50"
                title="打开田字格/演算手写草稿板"
              >
                <FileSignature className="w-4 h-4" />
              </button>
            </div>
          </aside>
        )}

        {/* Center: Scrollable / Zoomable Worksheet Board */}
        <main
          ref={containerRef}
          className="flex-1 overflow-auto bg-slate-950 p-2 md:p-6 flex items-center justify-center relative touch-pan-x touch-pan-y"
        >
          {/* Scalable Worksheet Sheet Container */}
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out'
            }}
            className="relative bg-white shadow-2xl rounded-sm max-w-full"
          >
            {/* 1. Base Layer: Original SJKC Worksheet (Multi-Page PDF / Image) */}
            <img
              src={currentWorksheetUrl}
              alt={`Page ${currentPage}`}
              className="w-full max-w-[850px] object-contain pointer-events-none select-none block"
              draggable={false}
            />

            {/* 2. Interactive Handwriting Answer Layer (HTML5 Canvas with Pointer Events) */}
            <canvas
              ref={drawingCanvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                touchAction: 'none' // CRITICAL: prevents accidental page scrolling while student writes
              }}
              className={`absolute inset-0 w-full h-full ${
                isSubmitted
                  ? 'cursor-not-allowed'
                  : activeTool === 'pen'
                  ? 'cursor-crosshair'
                  : activeTool === 'eraser'
                  ? 'cursor-cell'
                  : 'cursor-text'
              }`}
            />

            {/* 3. Typed Text Answer Layer (Allows typing Chinese characters, Malay, English) */}
            <div className="absolute inset-0 pointer-events-none">
              {typedTexts.map(tObj => (
                <div
                  key={tObj.id}
                  style={{
                    position: 'absolute',
                    left: `${tObj.x * 100}%`,
                    top: `${tObj.y * 100}%`,
                    pointerEvents: isSubmitted ? 'none' : 'auto'
                  }}
                  className="group relative"
                >
                  <input
                    type="text"
                    value={tObj.text}
                    placeholder="输入作答文字..."
                    onChange={e => handleUpdateTextContent(tObj.id, e.target.value)}
                    style={{
                      color: tObj.color,
                      fontSize: `${tObj.fontSize}px`
                    }}
                    className="bg-sky-50/80 border border-sky-300 rounded px-1.5 py-0.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-sm"
                  />
                  {!isSubmitted && (
                    <button
                      onClick={() => handleDeleteText(tObj.id)}
                      className="absolute -top-3 -right-3 bg-rose-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition shadow hover:bg-rose-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Bottom Floating Bar: Multi-Page Navigation & Zoom Controls */}
      <footer className="h-12 bg-slate-800 border-t border-slate-700 px-4 flex items-center justify-between shrink-0 text-xs text-slate-300">
        {/* Page Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-white px-2.5 py-1 rounded disabled:opacity-30 disabled:hover:bg-slate-700 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t.editor.prevPage}</span>
          </button>

          <span className="font-semibold text-slate-200 px-2 py-0.5 bg-slate-900 rounded border border-slate-700">
            {currentPage} / {assignment.pageCount}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= assignment.pageCount}
            className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-white px-2.5 py-1 rounded disabled:opacity-30 disabled:hover:bg-slate-700 transition"
          >
            <span className="hidden sm:inline">{t.editor.nextPage}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Student Active Name */}
        <div className="hidden md:flex items-center gap-2 text-slate-400">
          <span>学生：{currentUser?.displayName || '同学'}</span>
          <span>({currentUser?.studentId || 'SJKC'})</span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.15))}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300"
            title={t.editor.zoomOut}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="w-10 text-center font-mono">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel(prev => Math.min(1.8, prev + 0.15))}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300"
            title={t.editor.zoomIn}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300"
            title={t.editor.fitScreen}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* Clear Page Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400" />
              {t.editor.clearPage}
            </h3>
            <p className="text-sm text-slate-300 mb-5">
              {t.editor.clearConfirm}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-sm bg-slate-700 hover:bg-slate-600 text-slate-200"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleClearPage}
                className="px-3.5 py-1.5 rounded-lg text-sm bg-rose-600 hover:bg-rose-500 text-white font-medium shadow"
              >
                {t.common.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formal Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              {t.editor.submitConfirmTitle}
            </h3>
            <p className="text-sm text-slate-300 mb-4">
              {t.editor.submitConfirmDesc}
            </p>
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700 text-xs text-slate-300 mb-5 space-y-1">
              <div>• 作业：{assignment.title}</div>
              <div>• 总页数：{assignment.pageCount} 页</div>
              <div>• 学生姓名：{currentUser?.displayName}</div>
              <div>• 学号：{currentUser?.studentId || 'SJKC-2026'}</div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm bg-slate-700 hover:bg-slate-600 text-slate-200"
              >
                返回检查
              </button>
              <button
                onClick={handleFormalSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-2 shadow"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? t.editor.submitting : '确认提交'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scratchpad / Tian Zi Ge Handwriting Pad */}
      <HandwritingPadModal
        isOpen={showScratchpad}
        onClose={() => setShowScratchpad(false)}
        title="作答演算与田字格草稿板"
      />
    </div>
  );
};
