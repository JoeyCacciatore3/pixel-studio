export interface Tool {
  name: string;
  init(state: AppState, elements: CanvasElements): void;
  onPointerDown(coords: { x: number; y: number }, e: PointerEvent): void;
  onPointerMove(coords: { x: number; y: number }, e: PointerEvent): void;
  onPointerUp(e: PointerEvent): void;
  [key: string]: unknown; // Allow additional properties for tool-specific methods
}

export interface AppState {
  currentTool: string;
  currentColor: string;
  currentAlpha: number;
  brushSize: number;
  brushHardness: number;
  brushOpacity: number; // 0-100, separate from alpha
  brushFlow: number; // 0-100, paint build-up rate
  brushSpacing: number; // 1-1000%, brush stamp spacing
  brushJitter: number; // 0-100%, random variation
  brushTexture: string | null; // Texture pattern ID or null
  pressureEnabled: boolean; // Enable pressure sensitivity
  pressureSize: boolean; // Pressure affects size
  pressureOpacity: boolean; // Pressure affects opacity
  pressureFlow: boolean; // Pressure affects flow
  pressureCurve: PressureCurveType; // Pressure curve type
  stabilizerStrength: number; // 0-100, stabilizer strength
  tolerance: number;
  zoom: number;
  selection: Selection | null;
  colorRangeSelection: Uint8Array | null;
  selectionMode: SelectionMode; // Selection operation mode
  selectionFeather: number; // 0-100px, feather radius
  selectionAntiAlias: boolean; // Anti-aliased selection edges
  imageLayer: HTMLImageElement | null;
  imageOffsetX: number;
  imageOffsetY: number;
  layers: Layer[];
  activeLayerId: string | null;
}

export interface CanvasElements {
  canvas: HTMLCanvasElement | null;
  canvasWrapper: HTMLElement | null;
  selectionOverlay: HTMLElement | null;
  selectionCanvas: HTMLCanvasElement | null;
  colorPicker: HTMLInputElement | null;
  hexInput: HTMLInputElement | null;
  alphaInput: HTMLInputElement | null;
  brushSize: HTMLInputElement | null;
  brushHardness: HTMLInputElement | null;
  brushOpacity: HTMLInputElement | null;
  brushFlow: HTMLInputElement | null;
  brushSpacing: HTMLInputElement | null;
  brushJitter: HTMLInputElement | null;
  stabilizerStrength: HTMLInputElement | null;
  tolerance: HTMLInputElement | null;
  canvasWidth: HTMLInputElement | null;
  canvasHeight: HTMLInputElement | null;
  zoomLevel: HTMLElement | null;
  cursorPos: HTMLElement | null;
  canvasSize: HTMLElement | null;
  toolInfo: HTMLElement | null;
}

export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
  startX?: number;
  startY?: number;
  mode?: SelectionMode; // Selection mode when created
  feather?: number; // Feather radius
  antiAlias?: boolean; // Anti-aliased edges
}

export type SelectionMode = 'replace' | 'add' | 'subtract' | 'intersect';

export type PressureCurveType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'custom';

export interface PressureCurve {
  type: PressureCurveType;
  points?: [number, number][]; // For custom curves: [input, output] pairs
}

export interface BrushPreset {
  id: string;
  name: string;
  category: string;
  size: number;
  hardness: number;
  opacity: number;
  flow: number;
  spacing: number;
  jitter: number;
  texture: string | null;
  pressureSize: boolean;
  pressureOpacity: boolean;
  pressureFlow: boolean;
  pressureCurve: PressureCurveType;
}

export type ColorRangeSelection = Uint8Array;

export interface Layer {
  id: string;
  name: string;
  canvas: HTMLCanvasElement;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: string;
}

export interface LayerState {
  layers: Layer[];
  activeLayerId: string | null;
}

// Tool State Interfaces
// Base state that all tools have
export interface BaseToolState {
  state: AppState;
  elements: CanvasElements;
}

// Drawing tool state (pencil, eraser, clone, blur, sharpen, smudge)
export interface DrawingToolState extends BaseToolState {
  isDrawing: boolean;
  lastX: number;
  lastY: number;
  brushCache: Map<string, ImageData>;
  stabilizer: import('./tools/stabilizer').Stabilizer;
  distanceSinceLastStamp: number;
  lastStampX: number;
  lastStampY: number;
  currentPressure: number;
}

// Selection tool state (lasso, polygon, magnetic)
export interface SelectionToolState extends BaseToolState {
  isSelecting: boolean;
  points: Array<{ x: number; y: number }>;
}

// Magnetic tool specific state
export interface MagneticToolState extends SelectionToolState {
  edgeMap: Float32Array | null;
  width: number;
  height: number;
}

// Clone tool specific state
export interface CloneToolState extends DrawingToolState {
  sourceX: number;
  sourceY: number;
  offsetX: number;
  offsetY: number;
  isSourceSet: boolean;
}

// Smudge tool specific state
export interface SmudgeToolState extends DrawingToolState {
  lastColor: Uint8Array;
}

// Bucket tool state
export interface BucketToolState extends BaseToolState {
  gapCloser: import('./tools/gapCloser').GapCloser;
}
