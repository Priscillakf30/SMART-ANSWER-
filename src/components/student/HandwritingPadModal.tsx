import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Download,
  Save,
  BookOpen,
  HelpCircle,
  Maximize2
} from 'lucide-react';
import { DrawingStroke } from '../../types';
import { HandwritingCanvas, PaperGridType } from './HandwritingCanvas';

interface HandwritingPadModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  initialGrid?: PaperGridType;
}

export const HandwritingPadModal: React.FC<HandwritingPadModalProps> = ({
  isOpen,
  onClose,
  title = '数码手写作答板 (Digital Handwriting Pad)',
  initialGrid = 'tianzige'
}) => {
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [grid, setGrid] = useState<PaperGridType>(initialGrid);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center text-white font-bold">
              ✍️
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">{title}</h2>
              <p className="text-[11px] text-slate-400">
                支持手指触控、手写笔 (Stylus) 或鼠标书写 • 适合田字格练字与草稿演算
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: The Handwriting Canvas */}
        <div className="p-4 sm:p-6 bg-slate-50 flex-1 overflow-y-auto flex flex-col">
          <div className="mb-3 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">当前底纸：</span>
              <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-medium">
                {grid === 'tianzige'
                  ? '华小田字格 (生字与汉字笔顺)'
                  : grid === 'lines'
                  ? '横线本 (句子理解与作文草稿)'
                  : grid === 'mathgrid'
                  ? '方格纸 (数学四则运算草稿)'
                  : '空白纯白画板'}
              </span>
            </div>
            <span className="text-slate-400 hidden sm:inline">
              笔画数: {strokes.length}
            </span>
          </div>

          <div className="flex-1 min-h-[380px] sm:min-h-[460px] flex items-center justify-center">
            <HandwritingCanvas
              strokes={strokes}
              onStrokesChange={setStrokes}
              gridType={grid}
              onGridTypeChange={setGrid}
              aspectRatio="16/10"
              className="w-full shadow-md"
            />
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2 text-[11px]">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>提示：平板与手机作答时，单指即可流畅书写汉字；点击右上角箭头或下载按钮可保存练习图片。</span>
            </div>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition self-end sm:self-auto"
            >
              完成作答
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
