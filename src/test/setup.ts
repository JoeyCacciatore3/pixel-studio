import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Ensure ImageData is available in test environment
if (typeof ImageData === 'undefined') {
  // @ts-ignore - Polyfill for Node.js test environment
  global.ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;

    constructor(widthOrData: number | Uint8ClampedArray, height?: number) {
      if (typeof widthOrData === 'number') {
        this.width = widthOrData;
        this.height = height || widthOrData;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      } else {
        this.data = widthOrData;
        this.width = height || 1;
        this.height = widthOrData.length / (4 * (height || 1));
      }
    }
  };
}

// Mock canvas for testing
const mockContext = {
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => {
    const data = new Uint8ClampedArray(512 * 512 * 4);
    return new ImageData(data, 512, 512);
  }),
  putImageData: vi.fn(),
  createImageData: vi.fn((width: number, height?: number) => {
    const data = new Uint8ClampedArray((width || 1) * (height || width || 1) * 4);
    return new ImageData(data, width || 1, height || width || 1);
  }),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  globalCompositeOperation: 'source-over',
} as unknown as CanvasRenderingContext2D;

HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
  if (contextId === '2d') {
    return mockContext;
  }
  return null;
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;
