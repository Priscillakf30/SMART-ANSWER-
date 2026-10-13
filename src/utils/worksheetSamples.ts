// Pre-crafted authentic Malaysian SJKC worksheets rendered as high-fidelity SVG data URLs
// These provide instant, realistic multi-page worksheets for teachers and students

export interface WorksheetTemplate {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  pageCount: number;
  maximumMarks: number;
  instructions: string;
  pages: string[]; // SVG Data URLs
  sampleQuestions: { number: string; maxMarks: number }[];
}

function createSvgDataUrl(svgString: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

// 1. 三年级 华文 理解与书写 (2 Pages)
const sjkcChineseP1 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="800" height="1100" style="background:#ffffff; font-family:'PingFang SC','Microsoft YaHei',sans-serif;">
  <rect x="0" y="0" width="800" height="1100" fill="#ffffff"/>
  <!-- Border and Header -->
  <rect x="25" y="25" width="750" height="1050" fill="none" stroke="#2c3e50" stroke-width="2" rx="4"/>
  <rect x="25" y="25" width="750" height="70" fill="#f8fafc" stroke="#2c3e50" stroke-width="1"/>
  
  <text x="400" y="55" font-size="20" font-weight="bold" fill="#1e293b" text-anchor="middle">国民型华文小学 SJK(C)</text>
  <text x="400" y="80" font-size="14" fill="#64748b" text-anchor="middle">三年级 华文科单元一评估练习 (第 1 页，共 2 页)</text>

  <!-- Student Info Box -->
  <rect x="45" y="105" width="710" height="40" fill="#f1f5f9" rx="4"/>
  <text x="60" y="130" font-size="13" fill="#334155">姓名：__________________</text>
  <text x="320" y="130" font-size="13" fill="#334155">班级：3 红班 (3 Merah)</text>
  <text x="560" y="130" font-size="13" fill="#334155">满分：50 分</text>

  <!-- Section A: 词语与生字书写 (田字格) -->
  <text x="45" y="175" font-size="16" font-weight="bold" fill="#0f172a">一、看拼音，在田字格内端正写出汉字。(10分)</text>
  <text x="45" y="200" font-size="13" fill="#475569">指引：请使用黑笔或深色笔，注意笔画顺序与结构平衡。</text>

  <!-- Tian Zi Ge Box 1 -->
  <g transform="translate(60, 220)">
    <text x="40" y="-10" font-size="14" fill="#0284c7" font-weight="bold" text-anchor="middle">chén guāng</text>
    <rect x="0" y="0" width="80" height="80" fill="#fff" stroke="#94a3b8" stroke-width="1.5"/>
    <line x1="0" y1="40" x2="80" y2="40" stroke="#cbd5e1" stroke-dasharray="3,3"/>
    <line x1="40" y1="0" x2="40" y2="80" stroke="#cbd5e1" stroke-dasharray="3,3"/>
    <rect x="90" y="0" width="80" height="80" fill="#fff" stroke="#94a3b8" stroke-width="1.5"/>
    <line x1="90" y1="40" x2="170" y2="40" stroke="#cbd5e1" stroke-dasharray="3,3"/>
    <line x1="130" y1="0" x2="130" y2="80" stroke="#cbd5e1" stroke-dasharray="3,3"/>
    <text x="185" y="45" font-size="14" fill="#64748b">(晨光)</text>
  </g>

  <!-- Tian Zi Ge Box 2 -->
  <g transform="translate(420, 220)">
    <text x="40" y="-10" font-size="14" fill="#0284c7" font-weight="bold" text-anchor="middle">zāo gāo</text>
    <rect x="0" y="0" width="80" height="80" fill="#fff" stroke="#94a3b8" stroke-width="1.5"/>
    <line x1="0" y1="40" x2="80" y2="40" stroke="#cbd5e1" stroke-dasharray="3,3"/>
    <line x1="40" y1="0" x2="40" y2="80" stroke="#cbd5e1" stroke-dasharray="3,3"/>
    <rect x="90" y="0" width="80" height="80" fill="#fff" stroke="#94a3b8" stroke-width="1.5"/>
    <line x1="90" y1="40" x2="170" y2="40" stroke="#cbd5e1" stroke-dasharray="3,3"/>
    <line x1="130" y1="0" x2="130" y2="80" stroke="#cbd5e1" stroke-dasharray="3,3"/>
    <text x="185" y="45" font-size="14" fill="#64748b">(糟糕)</text>
  </g>

  <!-- Section B: 短文阅读理解 -->
  <text x="45" y="340" font-size="16" font-weight="bold" fill="#0f172a">二、阅读下面的短文，然后回答问题。(15分)</text>
  
  <rect x="45" y="360" width="710" height="150" fill="#f8fafc" stroke="#e2e8f0" rx="6"/>
  <text x="70" y="390" font-size="14" fill="#334155" line-height="24">清晨，阳光洒满了校园的每个角落。校门前，值日老师亲切地向同学们问好；</text>
  <text x="70" y="420" font-size="14" fill="#334155">操场上，同学们精神抖擞地做着早操，欢笑声在绿草地上回荡。</text>
  <text x="70" y="450" font-size="14" fill="#334155">走进教室，朗朗的读书声此起彼落。大家都珍惜宝贵的清晨时光，为新的一天</text>
  <text x="70" y="480" font-size="14" fill="#334155">努力学习，做个自律且懂礼貌的好学生。</text>

  <!-- Question 1 -->
  <text x="50" y="540" font-size="14" font-weight="bold" fill="#1e293b">1. 谁在校门前向同学们问好？(5分)</text>
  <line x1="70" y1="580" x2="720" y2="580" stroke="#94a3b8" stroke-width="1"/>
  <line x1="70" y1="620" x2="720" y2="620" stroke="#94a3b8" stroke-width="1"/>

  <!-- Question 2 -->
  <text x="50" y="660" font-size="14" font-weight="bold" fill="#1e293b">2. 操场上的同学们在做什么？从哪里可以看出他们的精神状态？(10分)</text>
  <line x1="70" y1="710" x2="720" y2="710" stroke="#94a3b8" stroke-width="1"/>
  <line x1="70" y1="755" x2="720" y2="755" stroke="#94a3b8" stroke-width="1"/>
  <line x1="70" y1="800" x2="720" y2="800" stroke="#94a3b8" stroke-width="1"/>

  <!-- Question 3 -->
  <text x="50" y="845" font-size="14" font-weight="bold" fill="#1e293b">3. 选词填空：把最适合的词语写在横线上。(10分)</text>
  <rect x="70" y="865" width="650" height="36" fill="#e0f2fe" stroke="#38bdf8" rx="4"/>
  <text x="400" y="888" font-size="13" font-weight="bold" fill="#0369a1" text-anchor="middle">【 珍惜 ； 亲切 ； 抖擞 ； 宝贵 】</text>

  <text x="70" y="930" font-size="14" fill="#334155">(a) 妈妈用 (________________) 的笑容迎接刚回家的姐姐。</text>
  <text x="70" y="975" font-size="14" fill="#334155">(b) 时间十分 (________________)，我们要好好利用每一分每一秒。</text>

  <!-- Footer -->
  <text x="400" y="1050" font-size="12" fill="#94a3b8" text-anchor="middle">- 1 / 2 - [翻至下一页继续作答]</text>
</svg>
`;

const sjkcChineseP2 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="800" height="1100" style="background:#ffffff; font-family:'PingFang SC','Microsoft YaHei',sans-serif;">
  <rect x="0" y="0" width="800" height="1100" fill="#ffffff"/>
  <rect x="25" y="25" width="750" height="1050" fill="none" stroke="#2c3e50" stroke-width="2" rx="4"/>
  <rect x="25" y="25" width="750" height="50" fill="#f8fafc" stroke="#2c3e50" stroke-width="1"/>
  
  <text x="400" y="55" font-size="16" font-weight="bold" fill="#1e293b" text-anchor="middle">三年级 华文科单元一评估练习 (第 2 页，共 2 页)</text>

  <!-- Section C: 造句与写作应用 -->
  <text x="45" y="110" font-size="16" font-weight="bold" fill="#0f172a">三、应用词语，各造一个意思完整、通顺的句子。(15分)</text>

  <!-- Sentence 1 -->
  <text x="50" y="150" font-size="14" font-weight="bold" fill="#1e293b">1. 欢声笑语 (7分)</text>
  <line x1="70" y1="195" x2="720" y2="195" stroke="#94a3b8" stroke-width="1"/>
  <line x1="70" y1="240" x2="720" y2="240" stroke="#94a3b8" stroke-width="1"/>

  <!-- Sentence 2 -->
  <text x="50" y="290" font-size="14" font-weight="bold" fill="#1e293b">2. 努力 (8分)</text>
  <line x1="70" y1="335" x2="720" y2="335" stroke="#94a3b8" stroke-width="1"/>
  <line x1="70" y1="380" x2="720" y2="380" stroke="#94a3b8" stroke-width="1"/>

  <!-- Section D: 思维高层次问答题 -->
  <text x="45" y="440" font-size="16" font-weight="bold" fill="#0f172a">四、高层次思维 (KBAT) 简答题 (10分)</text>
  <text x="50" y="475" font-size="14" font-weight="bold" fill="#1e293b">如果你看到有同学在操场上乱丢垃圾，你会怎么做？为什么？</text>
  <line x1="70" y1="525" x2="720" y2="525" stroke="#94a3b8" stroke-width="1"/>
  <line x1="70" y1="575" x2="720" y2="575" stroke="#94a3b8" stroke-width="1"/>
  <line x1="70" y1="625" x2="720" y2="625" stroke="#94a3b8" stroke-width="1"/>
  <line x1="70" y1="675" x2="720" y2="675" stroke="#94a3b8" stroke-width="1"/>

  <!-- Teacher Mark Box -->
  <rect x="520" y="740" width="220" height="150" fill="#fef2f2" stroke="#ef4444" stroke-dasharray="4,4" rx="8"/>
  <text x="630" y="775" font-size="14" font-weight="bold" fill="#b91c1c" text-anchor="middle">老师评分栏</text>
  <text x="540" y="810" font-size="13" fill="#991b1b">本页得分：____ / 25</text>
  <text x="540" y="840" font-size="13" fill="#991b1b">全卷总分：____ / 50</text>
  <text x="540" y="870" font-size="12" fill="#7f1d1d">评语：________________</text>

  <text x="400" y="1050" font-size="12" fill="#94a3b8" text-anchor="middle">- 2 / 2 - [全卷完，请检查后点击右上角提交]</text>
</svg>
`;

// 2. 四年级 数学 混合运算与应用题 (2 Pages)
const sjkcMathP1 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="800" height="1100" style="background:#ffffff; font-family:'PingFang SC','Segoe UI',sans-serif;">
  <rect x="0" y="0" width="800" height="1100" fill="#ffffff"/>
  <rect x="25" y="25" width="750" height="1050" fill="none" stroke="#1e3a8a" stroke-width="2" rx="4"/>
  <rect x="25" y="25" width="750" height="70" fill="#eff6ff" stroke="#1e3a8a" stroke-width="1"/>
  
  <text x="400" y="55" font-size="20" font-weight="bold" fill="#1e3a8a" text-anchor="middle">国民型华文小学 SJK(C)</text>
  <text x="400" y="80" font-size="14" fill="#3b82f6" text-anchor="middle">四年级 数学单元评估练习：100,000 以内的整数与运算 (第 1 页)</text>

  <rect x="45" y="105" width="710" height="40" fill="#f8fafc" rx="4"/>
  <text x="60" y="130" font-size="13" fill="#334155">姓名：__________________</text>
  <text x="320" y="130" font-size="13" fill="#334155">班级：4 蓝班 (4 Biru)</text>
  <text x="560" y="130" font-size="13" fill="#334155">总分：100 分</text>

  <text x="45" y="180" font-size="16" font-weight="bold" fill="#0f172a">甲组：演算并写出正确答案。(40分)</text>

  <!-- Problem 1 -->
  <g transform="translate(45, 210)">
    <text x="10" y="20" font-size="15" font-weight="bold" fill="#1e293b">1.  35 480 + 12 795 = </text>
    <rect x="10" y="35" width="320" height="160" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="2,2"/>
    <text x="25" y="60" font-size="12" fill="#94a3b8">直式演算区：</text>
  </g>

  <!-- Problem 2 -->
  <g transform="translate(420, 210)">
    <text x="10" y="20" font-size="15" font-weight="bold" fill="#1e293b">2.  72 000 - 18 456 = </text>
    <rect x="10" y="35" width="320" height="160" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="2,2"/>
    <text x="25" y="60" font-size="12" fill="#94a3b8">直式演算区：</text>
  </g>

  <!-- Problem 3 -->
  <g transform="translate(45, 430)">
    <text x="10" y="20" font-size="15" font-weight="bold" fill="#1e293b">3.  4 520 × 16 = </text>
    <rect x="10" y="35" width="320" height="170" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="2,2"/>
    <text x="25" y="60" font-size="12" fill="#94a3b8">直式演算区：</text>
  </g>

  <!-- Problem 4 -->
  <g transform="translate(420, 430)">
    <text x="10" y="20" font-size="15" font-weight="bold" fill="#1e293b">4.  56 840 ÷ 8 = </text>
    <rect x="10" y="35" width="320" height="170" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="2,2"/>
    <text x="25" y="60" font-size="12" fill="#94a3b8">直式演算区：</text>
  </g>

  <!-- Problem 5: 混合运算 -->
  <g transform="translate(45, 660)">
    <text x="10" y="20" font-size="15" font-weight="bold" fill="#1e293b">5.  80 000 - 4 250 × 8 = </text>
    <rect x="10" y="35" width="695" height="150" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="2,2"/>
    <text x="25" y="60" font-size="12" fill="#94a3b8">计算步骤 (注意先乘除后加减)：</text>
  </g>

  <text x="400" y="1050" font-size="12" fill="#94a3b8" text-anchor="middle">- 1 / 2 - [翻至下一页解决应用题]</text>
</svg>
`;

const sjkcMathP2 = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1100" width="800" height="1100" style="background:#ffffff; font-family:'PingFang SC','Segoe UI',sans-serif;">
  <rect x="0" y="0" width="800" height="1100" fill="#ffffff"/>
  <rect x="25" y="25" width="750" height="1050" fill="none" stroke="#1e3a8a" stroke-width="2" rx="4"/>
  <rect x="25" y="25" width="750" height="50" fill="#eff6ff" stroke="#1e3a8a" stroke-width="1"/>
  
  <text x="400" y="55" font-size="16" font-weight="bold" fill="#1e3a8a" text-anchor="middle">四年级 数学单元评估练习：应用题解决 (第 2 页)</text>

  <text x="45" y="110" font-size="16" font-weight="bold" fill="#0f172a">乙组：解决以下应用题，必须写出算式和答案。(60分)</text>

  <!-- Word Problem 1 -->
  <g transform="translate(45, 130)">
    <text x="10" y="20" font-size="14" font-weight="bold" fill="#1e293b">1. 一家制衣厂在上半年生产了 48 500 件 T 恤，下半年的产量比上半年多 12 340 件。</text>
    <text x="10" y="45" font-size="14" fill="#334155">(a) 该工厂在下半年生产了多少件 T 恤？(10分)</text>
    <rect x="10" y="60" width="695" height="110" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="2,2"/>
    <text x="25" y="85" font-size="12" fill="#94a3b8">答题/演算区：</text>

    <text x="10" y="195" font-size="14" fill="#334155">(b) 该工厂整年共生产了多少件 T 恤？(15分)</text>
    <rect x="10" y="210" width="695" height="120" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="2,2"/>
    <text x="25" y="235" font-size="12" fill="#94a3b8">答题/演算区：</text>
  </g>

  <!-- Word Problem 2 -->
  <g transform="translate(45, 500)">
    <text x="10" y="20" font-size="14" font-weight="bold" fill="#1e293b">2. 明华书局原有 35 箱彩色笔，每箱装有 48 盒。书局将其中 12 箱捐赠给孤儿院，</text>
    <text x="26" y="45" font-size="14" font-weight="bold" fill="#1e293b">其余的平均分派给 4 间分行出售。</text>
    <text x="10" y="75" font-size="14" fill="#334155">每间分行获得多少盒彩色笔？(25分)</text>
    <rect x="10" y="90" width="695" height="160" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="2,2"/>
    <text x="25" y="115" font-size="12" fill="#94a3b8">完整算式与演算步骤：</text>
  </g>

  <!-- Signoff / Score Box -->
  <rect x="480" y="820" width="260" height="120" fill="#f0fdf4" stroke="#22c55e" rx="8"/>
  <text x="610" y="855" font-size="14" font-weight="bold" fill="#15803d" text-anchor="middle">批改成绩总结</text>
  <text x="500" y="890" font-size="13" fill="#166534">甲组得分：____ / 40</text>
  <text x="500" y="915" font-size="13" fill="#166534">乙组得分：____ / 60  (总分：____ / 100)</text>

  <text x="400" y="1050" font-size="12" fill="#94a3b8" text-anchor="middle">- 2 / 2 - [全卷完]</text>
</svg>
`;

export const SAMPLES_CATALOG: WorksheetTemplate[] = [
  {
    id: 'sjkc-chinese-grade3-unit1',
    title: '三年级 华文单元一：美丽的校园 (阅读理解与书写)',
    subject: '华文 (Bahasa Cina)',
    gradeLevel: '三年级 (Standard 3)',
    pageCount: 2,
    maximumMarks: 50,
    instructions: '请用手写笔或文字工具在横线和田字格内规范作答。完成第1页和第2页后点击提交。',
    pages: [createSvgDataUrl(sjkcChineseP1), createSvgDataUrl(sjkcChineseP2)],
    sampleQuestions: [
      { number: '一、看拼音写词语', maxMarks: 10 },
      { number: '二、1. 理解问答', maxMarks: 5 },
      { number: '二、2. 精神状态分析', maxMarks: 10 },
      { number: '二、3. 选词填空', maxMarks: 10 },
      { number: '三、词语造句', maxMarks: 15 },
    ]
  },
  {
    id: 'sjkc-math-grade4-numbers',
    title: '四年级 数学：四则运算与实际应用题',
    subject: '数学 (Matematik)',
    gradeLevel: '四年级 (Standard 4)',
    pageCount: 2,
    maximumMarks: 100,
    instructions: '请写出完整的直式或横式演算步骤，并在横线上写出最终答案单位。',
    pages: [createSvgDataUrl(sjkcMathP1), createSvgDataUrl(sjkcMathP2)],
    sampleQuestions: [
      { number: '甲组 1. 加法直式', maxMarks: 8 },
      { number: '甲组 2. 减法直式', maxMarks: 8 },
      { number: '甲组 3. 乘法直式', maxMarks: 8 },
      { number: '甲组 4. 除法直式', maxMarks: 8 },
      { number: '甲组 5. 混合运算', maxMarks: 8 },
      { number: '乙组 1(a). 下半年产量', maxMarks: 10 },
      { number: '乙组 1(b). 全年产量', maxMarks: 15 },
      { number: '乙组 2. 彩色笔应用题', maxMarks: 25 },
    ]
  }
];
