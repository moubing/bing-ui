/**
 * 组件库内部使用的本地 SVG 图标。
 *
 * 图形数据固化自 Lucide v1.0.0（https://lucide.dev），遵循 ISC 许可（部分源自 Feather，MIT 许可）。
 * 完整许可文本见同目录 LICENSE-lucide.txt，构建时随产物一同发布。
 * 新增图标请在此文件补充固化数据，不要在组件中直接引入第三方图标库。
 */
import { createBingSvgIcon } from './createIcon'

/** 复选框从左侧起笔的勾与半选横线，共用 24 × 24 坐标系。 */
export const checkboxMarkPaths = {
  check: 'M4 12l5 5L20 6',
  mixed: 'M6 12h12',
} as const

export const AlertTriangle = /* @__PURE__ */ createBingSvgIcon('triangle-alert', [
  ['path', { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3' }],
  ['path', { d: 'M12 9v4' }],
  ['path', { d: 'M12 17h.01' }],
])

export const ArrowDown = /* @__PURE__ */ createBingSvgIcon('arrow-down', [
  ['path', { d: 'M12 5v14' }],
  ['path', { d: 'm19 12-7 7-7-7' }],
])

export const ArrowDownLeft = /* @__PURE__ */ createBingSvgIcon('arrow-down-left', [
  ['path', { d: 'M17 7 7 17' }],
  ['path', { d: 'M17 17H7V7' }],
])

export const ArrowDownRight = /* @__PURE__ */ createBingSvgIcon('arrow-down-right', [
  ['path', { d: 'm7 7 10 10' }],
  ['path', { d: 'M17 7v10H7' }],
])

export const ArrowLeftRight = /* @__PURE__ */ createBingSvgIcon('arrow-left-right', [
  ['path', { d: 'M8 3 4 7l4 4' }],
  ['path', { d: 'M4 7h16' }],
  ['path', { d: 'm16 21 4-4-4-4' }],
  ['path', { d: 'M20 17H4' }],
])

export const ArrowUp = /* @__PURE__ */ createBingSvgIcon('arrow-up', [
  ['path', { d: 'm5 12 7-7 7 7' }],
  ['path', { d: 'M12 19V5' }],
])

export const ArrowUpDown = /* @__PURE__ */ createBingSvgIcon('arrow-up-down', [
  ['path', { d: 'm21 16-4 4-4-4' }],
  ['path', { d: 'M17 20V4' }],
  ['path', { d: 'm3 8 4-4 4 4' }],
  ['path', { d: 'M7 4v16' }],
])

export const ArrowUpLeft = /* @__PURE__ */ createBingSvgIcon('arrow-up-left', [
  ['path', { d: 'M7 17V7h10' }],
  ['path', { d: 'M17 17 7 7' }],
])

export const ArrowUpRight = /* @__PURE__ */ createBingSvgIcon('arrow-up-right', [
  ['path', { d: 'M7 7h10v10' }],
  ['path', { d: 'M7 17 17 7' }],
])

export const CalendarDays = /* @__PURE__ */ createBingSvgIcon('calendar-days', [
  ['path', { d: 'M8 2v4' }],
  ['path', { d: 'M16 2v4' }],
  ['rect', { width: '18', height: '18', x: '3', y: '4', rx: '2' }],
  ['path', { d: 'M3 10h18' }],
  ['path', { d: 'M8 14h.01' }],
  ['path', { d: 'M12 14h.01' }],
  ['path', { d: 'M16 14h.01' }],
  ['path', { d: 'M8 18h.01' }],
  ['path', { d: 'M12 18h.01' }],
  ['path', { d: 'M16 18h.01' }],
])

export const Check = /* @__PURE__ */ createBingSvgIcon('check', [
  ['path', { d: 'M20 6 9 17l-5-5' }],
])

export const CheckCheck = /* @__PURE__ */ createBingSvgIcon('check-check', [
  ['path', { d: 'M18 6 7 17l-5-5' }],
  ['path', { d: 'm22 10-7.5 7.5L13 16' }],
])

export const CheckCircle2 = /* @__PURE__ */ createBingSvgIcon('circle-check', [
  ['circle', { cx: '12', cy: '12', r: '10' }],
  ['path', { d: 'm9 12 2 2 4-4' }],
])

export const ChevronDown = /* @__PURE__ */ createBingSvgIcon('chevron-down', [
  ['path', { d: 'm6 9 6 6 6-6' }],
])

export const ChevronLeft = /* @__PURE__ */ createBingSvgIcon('chevron-left', [
  ['path', { d: 'm15 18-6-6 6-6' }],
])

export const ChevronRight = /* @__PURE__ */ createBingSvgIcon('chevron-right', [
  ['path', { d: 'm9 18 6-6-6-6' }],
])

export const ChevronUp = /* @__PURE__ */ createBingSvgIcon('chevron-up', [
  ['path', { d: 'm18 15-6-6-6 6' }],
])

export const ChevronsLeft = /* @__PURE__ */ createBingSvgIcon('chevrons-left', [
  ['path', { d: 'm11 17-5-5 5-5' }],
  ['path', { d: 'm18 17-5-5 5-5' }],
])

export const ChevronsRight = /* @__PURE__ */ createBingSvgIcon('chevrons-right', [
  ['path', { d: 'm6 17 5-5-5-5' }],
  ['path', { d: 'm13 17 5-5-5-5' }],
])

export const CircleHelp = /* @__PURE__ */ createBingSvgIcon('circle-question-mark', [
  ['circle', { cx: '12', cy: '12', r: '10' }],
  ['path', { d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3' }],
  ['path', { d: 'M12 17h.01' }],
])

export const Clock3 = /* @__PURE__ */ createBingSvgIcon('clock-3', [
  ['circle', { cx: '12', cy: '12', r: '10' }],
  ['path', { d: 'M12 6v6h4' }],
])

export const Columns3 = /* @__PURE__ */ createBingSvgIcon('columns-3', [
  ['rect', { width: '18', height: '18', x: '3', y: '3', rx: '2' }],
  ['path', { d: 'M9 3v18' }],
  ['path', { d: 'M15 3v18' }],
])

export const Copy = /* @__PURE__ */ createBingSvgIcon('copy', [
  ['rect', { width: '14', height: '14', x: '8', y: '8', rx: '2', ry: '2' }],
  ['path', { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' }],
])

export const Download = /* @__PURE__ */ createBingSvgIcon('download', [
  ['path', { d: 'M12 15V3' }],
  ['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }],
  ['path', { d: 'm7 10 5 5 5-5' }],
])

export const ExternalLink = /* @__PURE__ */ createBingSvgIcon('external-link', [
  ['path', { d: 'M15 3h6v6' }],
  ['path', { d: 'M10 14 21 3' }],
  ['path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }],
])

export const Eye = /* @__PURE__ */ createBingSvgIcon('eye', [
  ['path', { d: 'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0' }],
  ['circle', { cx: '12', cy: '12', r: '3' }],
])

export const EyeOff = /* @__PURE__ */ createBingSvgIcon('eye-off', [
  ['path', { d: 'M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49' }],
  ['path', { d: 'M14.084 14.158a3 3 0 0 1-4.242-4.242' }],
  ['path', { d: 'M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143' }],
  ['path', { d: 'm2 2 20 20' }],
])

export const File = /* @__PURE__ */ createBingSvgIcon('file', [
  ['path', { d: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z' }],
  ['path', { d: 'M14 2v5a1 1 0 0 0 1 1h5' }],
])

export const FileBraces = /* @__PURE__ */ createBingSvgIcon('file-braces', [
  ['path', { d: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z' }],
  ['path', { d: 'M14 2v5a1 1 0 0 0 1 1h5' }],
  ['path', { d: 'M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1' }],
  ['path', { d: 'M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1' }],
])

export const FileImage = /* @__PURE__ */ createBingSvgIcon('file-image', [
  ['path', { d: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z' }],
  ['path', { d: 'M14 2v5a1 1 0 0 0 1 1h5' }],
  ['circle', { cx: '10', cy: '12', r: '2' }],
  ['path', { d: 'm20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22' }],
])

export const FileQuestionMark = /* @__PURE__ */ createBingSvgIcon('file-question-mark', [
  ['path', { d: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z' }],
  ['path', { d: 'M12 17h.01' }],
  ['path', { d: 'M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3' }],
])

export const FileSpreadsheet = /* @__PURE__ */ createBingSvgIcon('file-spreadsheet', [
  ['path', { d: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z' }],
  ['path', { d: 'M14 2v5a1 1 0 0 0 1 1h5' }],
  ['path', { d: 'M8 13h2' }],
  ['path', { d: 'M14 13h2' }],
  ['path', { d: 'M8 17h2' }],
  ['path', { d: 'M14 17h2' }],
])

export const FileText = /* @__PURE__ */ createBingSvgIcon('file-text', [
  ['path', { d: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z' }],
  ['path', { d: 'M14 2v5a1 1 0 0 0 1 1h5' }],
  ['path', { d: 'M10 9H8' }],
  ['path', { d: 'M16 13H8' }],
  ['path', { d: 'M16 17H8' }],
])

export const FileType = /* @__PURE__ */ createBingSvgIcon('file-type', [
  ['path', { d: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z' }],
  ['path', { d: 'M14 2v5a1 1 0 0 0 1 1h5' }],
  ['path', { d: 'M11 18h2' }],
  ['path', { d: 'M12 12v6' }],
  ['path', { d: 'M9 13v-.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5v.5' }],
])

export const GripVertical = /* @__PURE__ */ createBingSvgIcon('grip-vertical', [
  ['circle', { cx: '9', cy: '12', r: '1' }],
  ['circle', { cx: '9', cy: '5', r: '1' }],
  ['circle', { cx: '9', cy: '19', r: '1' }],
  ['circle', { cx: '15', cy: '12', r: '1' }],
  ['circle', { cx: '15', cy: '5', r: '1' }],
  ['circle', { cx: '15', cy: '19', r: '1' }],
])

export const Info = /* @__PURE__ */ createBingSvgIcon('info', [
  ['circle', { cx: '12', cy: '12', r: '10' }],
  ['path', { d: 'M12 16v-4' }],
  ['path', { d: 'M12 8h.01' }],
])

export const ListCollapse = /* @__PURE__ */ createBingSvgIcon('list-collapse', [
  ['path', { d: 'M10 5h11' }],
  ['path', { d: 'M10 12h11' }],
  ['path', { d: 'M10 19h11' }],
  ['path', { d: 'm3 10 3-3-3-3' }],
  ['path', { d: 'm3 20 3-3-3-3' }],
])

export const ListTree = /* @__PURE__ */ createBingSvgIcon('list-tree', [
  ['path', { d: 'M8 5h13' }],
  ['path', { d: 'M13 12h8' }],
  ['path', { d: 'M13 19h8' }],
  ['path', { d: 'M3 10a2 2 0 0 0 2 2h3' }],
  ['path', { d: 'M3 5v12a2 2 0 0 0 2 2h3' }],
])

export const ListX = /* @__PURE__ */ createBingSvgIcon('list-x', [
  ['path', { d: 'M16 5H3' }],
  ['path', { d: 'M11 12H3' }],
  ['path', { d: 'M16 19H3' }],
  ['path', { d: 'm15.5 9.5 5 5' }],
  ['path', { d: 'm20.5 9.5-5 5' }],
])

export const LoaderCircle = /* @__PURE__ */ createBingSvgIcon('loader-circle', [
  ['path', { d: 'M21 12a9 9 0 1 1-6.219-8.56' }],
])

export const Pin = /* @__PURE__ */ createBingSvgIcon('pin', [
  ['path', { d: 'M12 17v5' }],
  ['path', { d: 'M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z' }],
])

export const Presentation = /* @__PURE__ */ createBingSvgIcon('presentation', [
  ['path', { d: 'M2 3h20' }],
  ['path', { d: 'M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3' }],
  ['path', { d: 'm7 21 5-5 5 5' }],
])

export const RefreshCcw = /* @__PURE__ */ createBingSvgIcon('refresh-ccw', [
  ['path', { d: 'M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }],
  ['path', { d: 'M3 3v5h5' }],
  ['path', { d: 'M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16' }],
  ['path', { d: 'M16 16h5v5' }],
])

export const RotateCcw = /* @__PURE__ */ createBingSvgIcon('rotate-ccw', [
  ['path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }],
  ['path', { d: 'M3 3v5h5' }],
])

export const RotateCw = /* @__PURE__ */ createBingSvgIcon('rotate-cw', [
  ['path', { d: 'M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8' }],
  ['path', { d: 'M21 3v5h-5' }],
])

export const Search = /* @__PURE__ */ createBingSvgIcon('search', [
  ['path', { d: 'm21 21-4.34-4.34' }],
  ['circle', { cx: '11', cy: '11', r: '8' }],
])

export const Sparkles = /* @__PURE__ */ createBingSvgIcon('sparkles', [
  ['path', { d: 'M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z' }],
  ['path', { d: 'M20 2v4' }],
  ['path', { d: 'M22 4h-4' }],
  ['circle', { cx: '4', cy: '20', r: '2' }],
])

export const X = /* @__PURE__ */ createBingSvgIcon('x', [
  ['path', { d: 'M18 6 6 18' }],
  ['path', { d: 'm6 6 12 12' }],
])

export const XCircle = /* @__PURE__ */ createBingSvgIcon('circle-x', [
  ['circle', { cx: '12', cy: '12', r: '10' }],
  ['path', { d: 'm15 9-6 6' }],
  ['path', { d: 'm9 9 6 6' }],
])

export const ZoomIn = /* @__PURE__ */ createBingSvgIcon('zoom-in', [
  ['circle', { cx: '11', cy: '11', r: '8' }],
  ['line', { 'x1': '21', 'x2': '16.65', 'y1': '21', 'y2': '16.65' }],
  ['line', { 'x1': '11', 'x2': '11', 'y1': '8', 'y2': '14' }],
  ['line', { 'x1': '8', 'x2': '14', 'y1': '11', 'y2': '11' }],
])

export const ZoomOut = /* @__PURE__ */ createBingSvgIcon('zoom-out', [
  ['circle', { cx: '11', cy: '11', r: '8' }],
  ['line', { 'x1': '21', 'x2': '16.65', 'y1': '21', 'y2': '16.65' }],
  ['line', { 'x1': '8', 'x2': '14', 'y1': '11', 'y2': '11' }],
])
