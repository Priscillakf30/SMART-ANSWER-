import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pen,
  Eraser,
  RotateCcw,
  RotateCw,
  Trash2,
  Download,
  Grid,
  Check,
  Maximize2,
  Sparkles,
  Sliders,
  Highlighter
} from 'lucide-react';
import { DrawingPoint, DrawingStroke } from '../../types';

export type PaperGridType = 'none' | 'tianzige' | 'lines' | 'mathgrid';

export interface HandwritingCanvasProps {
  /** Current array of vector strokes */
  strokes: DrawingStroke[];
  /** Callback fired whenever strokes change (after drawing, erasing, undo, redo, clear) */
  onStrokesChange: (strokes: DrawingStroke[]) => void;
  /** Optional background image or worksheet page URL */
  backgroundImageUrl?: string;
  /** Whether the canvas is in read-only mode (e.g. for reviewing submitted work) */
  readOnly?: boolean;
  /** Grid overlay type: 'none' | 'tianzige' (田字格) | 'lines' (横线本) | 'mathgrid' (方格本) */
  gridType?: PaperGridType;
  /** Optional callback when grid type changes */
  onGridTypeChange?: (grid: PaperGridType) => void;
  /** Optional custom CSS classes */
  className?: string;
  /** Optional width/height aspect ratio, defaults to 4/3 or 1 */
  aspectRatio?: string;
  /** Show the built-in compact child-friendly toolbar */
  showToolbar?: boolean;
}

const PALETTE = [
  { name: '经典黑 (Black)', hex: '#0f172a', label: '黑' },
  { name: '书写蓝 (Blue)', hex: '#1d4ed8', label: '蓝' },
  { name: '批改红 (Red)', hex: '#dc2626', label: '红' },
  { name: '护眼绿 (Green)', hex: '#16a34a', label: '绿' },
  { name: '荧光黄 (Highlight)', hex: '#eab308', isHighlight: true, label: '黄' }
];

const STROKE_WIDTHS = [
  { label: '细 2px', value: 2 },
  { label: '中 4px', value: 4 },
  { label: '粗 7px', value: 7 },
  { label: '特粗 12px', value: 12 }
];

export const HandwritingCanvas: React.FC<HandwritingCanvasProps> = ({
  strokes,
  onStrokesChange,
  backgroundImageUrl,
  readOnly = false,
  gridType = 'none',
  onGridTypeChange,
  className = '',
  aspectRatio = '4/3',
  showToolbar = true
}) => {
  // Tool state
  const [activeTool, setActiveTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [selectedColor, setSelectedColor] = useState(PALETTE[0].hex);
  const [selectedWidth, setSelectedWidth] = useState(4);
  const [currentGrid, setCurrentGrid] = useState<PaperGridType>(gridType);

  // Undo / Redo history
  const [undoStack, setUndoStack] = useState<DrawingStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingStroke[][]>([]);

  // Canvas element refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPointerDownRef = useRef(false);
  const currentStrokeRef = useRef<DrawingStroke | null>(null);

  // Sync prop changes for grid
  useEffect(() => {
    setCurrentGrid(gridType);
  }, [gridType]);

  const handleGridChange = (g: PaperGridType) => {
    setCurrentGrid(g);
    onGridTypeChange?.(g);
  };

  /**
   * Render grid guidelines on background if requested (田字格, 横线, 方格)
   */
  const drawBackgroundGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (currentGrid === 'none') return;

    ctx.save();
    if (currentGrid === 'tianzige') {
      // SJKC Standard Tian Zi Ge grid (田字格)
      const gridSize = Math.min(width, height) / 4;
      const cols = Math.floor(width / gridSize);
      const rows = Math.floor(height / gridSize);
      const offsetX = (width - cols * gridSize) / 2;
      const offsetY = (height - rows * gridSize) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = offsetX + c * gridSize;
          const y = offsetY + r * gridSize;

          // Outer solid border
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(x, y, gridSize, gridSize);

          // Inner cross dashed lines (+ shape)
          ctx.beginPath();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1;
          // Horizontal dash
          ctx.moveTo(x, y + gridSize / 2);
          ctx.lineTo(x + gridSize, y + gridSize / 2);
          // Vertical dash
          ctx.moveTo(x + gridSize / 2, y);
          ctx.lineTo(x + gridSize / 2, y + gridSize);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    } else if (currentGrid === 'lines') {
      // Ruled lines for Malay / Chinese writing exercises
      const lineSpacing = 36;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      for (let y = lineSpacing; y < height; y += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (currentGrid === 'mathgrid') {
      // Mathematics small square grid
      const square = 28;
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      for (let x = square; x < width; x += square) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = square; y < height; y += square) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  /**
   * Main rendering loop: Redraws all vector strokes with smooth Bézier interpolation
   */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background guide grid if selected
    drawBackgroundGrid(ctx, canvas.width, canvas.height);

    // Render strokes with quadratic smoothing
    for (const stroke of strokes) {
      if (stroke.points.length === 0) continue;

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
        // Single tap dot
        ctx.arc(startX, startY, stroke.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
        ctx.restore();
        continue;
      }

      ctx.moveTo(startX, startY);

      // Smooth path using mid-point quadratic curve
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

      // Final segment to end point
      const last = stroke.points[stroke.points.length - 1];
      ctx.lineTo(last.x * canvas.width, last.y * canvas.height);

      ctx.stroke();
      ctx.restore();
    }
  }, [strokes, currentGrid]);

  // Adjust canvas pixel resolution to container's bounding rectangle
  const resizeCanvasToDisplaySize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const displayWidth = Math.floor(rect.width * dpr);
    const displayHeight = Math.floor(rect.height * dpr);

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }
    redraw();
  }, [redraw]);

  useEffect(() => {
    resizeCanvasToDisplaySize();
    window.addEventListener('resize', resizeCanvasToDisplaySize);
    return () => window.removeEventListener('resize', resizeCanvasToDisplaySize);
  }, [resizeCanvasToDisplaySize]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Pointer Event Handlers (Mouse, Finger Touch, Stylus/Pen)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    isPointerDownRef.current = true;

    const rect = canvas.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const isEraser = activeTool === 'eraser';
    const isHighlight = activeTool === 'highlighter';

    const color = isEraser
      ? '#ffffff'
      : isHighlight
      ? 'rgba(234, 179, 8, 0.45)'
      : selectedColor;

    const size = isEraser
      ? selectedWidth * 3.5
      : isHighlight
      ? selectedWidth * 2.5
      : selectedWidth;

    const newStroke: DrawingStroke = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      color,
      size,
      isEraser,
      points: [{ x: nx, y: ny, pressure: e.pressure || 0.5 }]
    };

    currentStrokeRef.current = newStroke;

    // Save previous state to undo stack
    setUndoStack(prev => [...prev, strokes]);
    setRedoStack([]);

    onStrokesChange([...strokes, newStroke]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current || !currentStrokeRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    currentStrokeRef.current.points.push({
      x: nx,
      y: ny,
      pressure: e.pressure || 0.5
    });

    const nextStrokes = [...strokes];
    nextStrokes[nextStrokes.length - 1] = { ...currentStrokeRef.current };
    onStrokesChange(nextStrokes);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDownRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    isPointerDownRef.current = false;
    currentStrokeRef.current = null;
  };

  // Undo / Redo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, strokes]);
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    onStrokesChange(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, strokes]);
    setRedoStack(prev => prev.slice(0, prev.length - 1));
    onStrokesChange(next);
  };

  // Clear all strokes
  const handleClear = () => {
    if (strokes.length === 0) return;
    if (confirm('确定要清空画板上的所有手写笔迹吗？')) {
      setUndoStack(prev => [...prev, strokes]);
      setRedoStack([]);
      onStrokesChange([]);
    }
  };

  // Export as PNG image download
  const handleExportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `sjkc-handwriting-${Date.now()}.png`;
    a.click();
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden select-none ${className}`}
    >
      {/* Optional Child-Friendly Handwriting Toolbar */}
      {showToolbar && !readOnly && (
        <div className="bg-slate-100/80 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Tool Modes: Pen, Highlighter, Eraser */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTool('pen')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
                activeTool === 'pen'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="铅笔/钢笔模式"
            >
              <Pen className="w-3.5 h-3.5" />
              <span>铅笔</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('highlighter')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
                activeTool === 'highlighter'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="荧光记号笔"
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span>荧光笔</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('eraser')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition ${
                activeTool === 'eraser'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="橡皮擦"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>橡皮擦</span>
            </button>
          </div>

          {/* Color Palette (Active when Pen) */}
          {activeTool === 'pen' && (
            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200">
              {PALETTE.filter(p => !p.isHighlight).map(color => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setSelectedColor(color.hex)}
                  style={{ backgroundColor: color.hex }}
                  className={`w-5 h-5 rounded-full border-2 transition ${
                    selectedColor === color.hex
                      ? 'border-white ring-2 ring-sky-500 scale-110 shadow-xs'
                      : 'border-transparent opacity-85 hover:opacity-100'
                  }`}
                  title={color.name}
                />
              ))}
            </div>
          )}

          {/* Stroke Width Selector */}
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-200">
            {STROKE_WIDTHS.map(sw => (
              <button
                key={sw.value}
                type="button"
                onClick={() => setSelectedWidth(sw.value)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition ${
                  selectedWidth === sw.value
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {sw.label.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Grid Guideline Selector (田字格, 横线, 方格) */}
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-400 font-medium">底格:</span>
            <button
              type="button"
              onClick={() => handleGridChange('none')}
              className={`px-1.5 py-0.5 rounded text-[11px] ${
                currentGrid === 'none' ? 'bg-sky-100 text-sky-800 font-bold' : 'text-slate-600'
              }`}
            >
              空白
            </button>
            <button
              type="button"
              onClick={() => handleGridChange('tianzige')}
              className={`px-1.5 py-0.5 rounded text-[11px] ${
                currentGrid === 'tianzige' ? 'bg-sky-100 text-sky-800 font-bold' : 'text-slate-600'
              }`}
              title="田字格 (生字与汉字书写)"
            >
              田字格
            </button>
            <button
              type="button"
              onClick={() => handleGridChange('lines')}
              className={`px-1.5 py-0.5 rounded text-[11px] ${
                currentGrid === 'lines' ? 'bg-sky-100 text-sky-800 font-bold' : 'text-slate-600'
              }`}
              title="横线本 (理解与造句作答)"
            >
              横线
            </button>
            <button
              type="button"
              onClick={() => handleGridChange('mathgrid')}
              className={`px-1.5 py-0.5 rounded text-[11px] ${
                currentGrid === 'mathgrid' ? 'bg-sky-100 text-sky-800 font-bold' : 'text-slate-600'
              }`}
              title="方格 (数学算式计算)"
            >
              方格
            </button>
          </div>

          {/* Actions: Undo, Redo, Clear, Save/Download */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white shadow-xs transition"
              title="撤销 (Undo)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white shadow-xs transition"
              title="重做 (Redo)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={strokes.length === 0}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:hover:bg-white shadow-xs transition"
              title="清空画板"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleExportImage}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-sky-600 hover:bg-sky-50 shadow-xs transition"
              title="导出下载手写图片 (PNG)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div
        style={{ aspectRatio }}
        className="relative w-full overflow-hidden bg-white cursor-crosshair touch-none"
      >
        {/* Optional Underlay Image (e.g. Worksheet Page) */}
        {backgroundImageUrl && (
          <img
            src={backgroundImageUrl}
            alt="Worksheet Background"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />
        )}

        {/* HTML5 Vector Drawing Canvas */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            touchAction: 'none' // CRITICAL: disables viewport scrolling exclusively on the drawing surface
          }}
          className={`absolute inset-0 w-full h-full ${
            readOnly
              ? 'cursor-default'
              : activeTool === 'pen'
              ? 'cursor-crosshair'
              : activeTool === 'eraser'
              ? 'cursor-cell'
              : 'cursor-text'
          }`}
        />

        {/* Child helper prompt on empty canvas */}
        {strokes.length === 0 && !readOnly && !backgroundImageUrl && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-300 text-xs sm:text-sm font-medium">
            <span>使用手指、手写笔或鼠标在此直接书写作答</span>
          </div>
        )}
      </div>
    </div>
  );
};
