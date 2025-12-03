import { describe, it, expect } from "vitest";
import { ImageProcessor } from "../../../src/lib/utils/imageProcessor.js";

describe("ImageProcessor.getImageDimensions", () => {
  describe("JPEG dimension extraction", () => {
    it("should extract dimensions from baseline JPEG with SOF0 marker", () => {
      // Create a minimal JPEG with SOF0 marker
      // Structure: SOI (FFD8) + APP0 (FFE0) segment + SOF0 (FFC0) segment
      const jpegBuffer = Buffer.from([
        // SOI marker
        0xff,
        0xd8,
        // APP0 marker (JFIF)
        0xff,
        0xe0,
        0x00,
        0x10, // marker + length (16 bytes)
        0x4a,
        0x46,
        0x49,
        0x46,
        0x00, // "JFIF\0"
        0x01,
        0x01,
        0x00,
        0x00,
        0x01,
        0x00,
        0x01,
        0x00,
        0x00, // version and density info
        // SOF0 marker (baseline DCT)
        0xff,
        0xc0,
        0x00,
        0x0b, // marker + length (11 bytes)
        0x08, // precision (8 bits)
        0x01,
        0x90, // height: 400 (0x0190)
        0x02,
        0x80, // width: 640 (0x0280)
        0x03,
        0x01,
        0x22,
        0x00, // component info
      ]);

      const result = ImageProcessor.getImageDimensions(jpegBuffer);

      expect(result).not.toBeNull();
      expect(result?.width).toBe(640);
      expect(result?.height).toBe(400);
    });

    it("should extract dimensions from progressive JPEG with SOF2 marker", () => {
      // Create a minimal JPEG with SOF2 marker
      const jpegBuffer = Buffer.from([
        // SOI marker
        0xff,
        0xd8,
        // SOF2 marker (progressive DCT)
        0xff,
        0xc2,
        0x00,
        0x0b, // marker + length (11 bytes)
        0x08, // precision (8 bits)
        0x03,
        0x20, // height: 800 (0x0320)
        0x04,
        0xb0, // width: 1200 (0x04b0)
        0x03,
        0x01,
        0x22,
        0x00, // component info
      ]);

      const result = ImageProcessor.getImageDimensions(jpegBuffer);

      expect(result).not.toBeNull();
      expect(result?.width).toBe(1200);
      expect(result?.height).toBe(800);
    });

    it("should return null for JPEG without SOF marker", () => {
      // Create a minimal JPEG without SOF marker
      const jpegBuffer = Buffer.from([
        // SOI marker
        0xff, 0xd8,
        // APP0 marker only
        0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00,
        0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
        // EOI marker
        0xff, 0xd9,
      ]);

      const result = ImageProcessor.getImageDimensions(jpegBuffer);

      expect(result).toBeNull();
    });

    it("should return null for truncated JPEG file", () => {
      // Create a truncated JPEG (SOI + start of APP0 marker only)
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);

      const result = ImageProcessor.getImageDimensions(jpegBuffer);

      expect(result).toBeNull();
    });

    it("should return null for truncated SOF marker", () => {
      // Create a JPEG with truncated SOF marker
      const jpegBuffer = Buffer.from([
        // SOI marker
        0xff, 0xd8,
        // SOF0 marker but truncated data
        0xff, 0xc0, 0x00, 0x0b, 0x08,
      ]);

      const result = ImageProcessor.getImageDimensions(jpegBuffer);

      expect(result).toBeNull();
    });

    it("should handle multiple 0xFF padding bytes before markers", () => {
      // Some JPEGs have multiple 0xFF bytes before the marker identifier
      const jpegBuffer = Buffer.from([
        // SOI marker
        0xff,
        0xd8,
        // Multiple padding 0xFF + SOF0 marker
        0xff,
        0xff,
        0xff,
        0xc0,
        0x00,
        0x0b,
        0x08, // precision
        0x00,
        0x64, // height: 100
        0x00,
        0xc8, // width: 200
        0x03,
        0x01,
        0x22,
        0x00,
      ]);

      const result = ImageProcessor.getImageDimensions(jpegBuffer);

      expect(result).not.toBeNull();
      expect(result?.width).toBe(200);
      expect(result?.height).toBe(100);
    });

    it("should handle small dimensions correctly", () => {
      const jpegBuffer = Buffer.from([
        0xff,
        0xd8,
        0xff,
        0xc0,
        0x00,
        0x0b,
        0x08,
        0x00,
        0x01, // height: 1
        0x00,
        0x01, // width: 1
        0x03,
        0x01,
        0x22,
        0x00,
      ]);

      const result = ImageProcessor.getImageDimensions(jpegBuffer);

      expect(result).not.toBeNull();
      expect(result?.width).toBe(1);
      expect(result?.height).toBe(1);
    });

    it("should handle large dimensions correctly", () => {
      const jpegBuffer = Buffer.from([
        0xff,
        0xd8,
        0xff,
        0xc0,
        0x00,
        0x0b,
        0x08,
        0xff,
        0xff, // height: 65535 (max uint16)
        0xff,
        0xff, // width: 65535 (max uint16)
        0x03,
        0x01,
        0x22,
        0x00,
      ]);

      const result = ImageProcessor.getImageDimensions(jpegBuffer);

      expect(result).not.toBeNull();
      expect(result?.width).toBe(65535);
      expect(result?.height).toBe(65535);
    });
  });

  describe("PNG dimension extraction", () => {
    it("should extract dimensions from PNG", () => {
      // Create a minimal PNG header
      const pngBuffer = Buffer.from([
        // PNG signature
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        // IHDR chunk length (13 bytes)
        0x00, 0x00, 0x00, 0x0d,
        // IHDR chunk type
        0x49, 0x48, 0x44, 0x52,
        // Width (320)
        0x00, 0x00, 0x01, 0x40,
        // Height (240)
        0x00, 0x00, 0x00, 0xf0,
        // Bit depth, color type, etc.
        0x08, 0x02, 0x00, 0x00, 0x00,
      ]);

      const result = ImageProcessor.getImageDimensions(pngBuffer);

      expect(result).not.toBeNull();
      expect(result?.width).toBe(320);
      expect(result?.height).toBe(240);
    });
  });

  describe("unsupported formats", () => {
    it("should return null for non-image data", () => {
      const textBuffer = Buffer.from("Hello, World!");

      const result = ImageProcessor.getImageDimensions(textBuffer);

      expect(result).toBeNull();
    });

    it("should return null for empty buffer", () => {
      const emptyBuffer = Buffer.alloc(0);

      const result = ImageProcessor.getImageDimensions(emptyBuffer);

      expect(result).toBeNull();
    });

    it("should return null for buffer too small for any image", () => {
      const smallBuffer = Buffer.from([0x89, 0x50]);

      const result = ImageProcessor.getImageDimensions(smallBuffer);

      expect(result).toBeNull();
    });
  });
});
