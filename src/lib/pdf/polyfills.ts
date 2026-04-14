/**
 * Minimal DOM API polyfills required by pdfjs-dist in a Node.js environment.
 * pdfjs-dist only needs these for visual rendering — text extraction (getTextContent)
 * does not use them, but the module initialisation still references them.
 *
 * These stubs satisfy those references without bringing in a full DOM implementation.
 */
export function applyPdfPolyfills() {
  if (typeof global === "undefined") return;

  const g = global as Record<string, unknown>;

  if (!g.DOMMatrix) {
    g.DOMMatrix = class DOMMatrix {
      static fromFloat32Array() {
        return new (g.DOMMatrix as new () => object)();
      }
      static fromFloat64Array() {
        return new (g.DOMMatrix as new () => object)();
      }
    };
  }

  if (!g.DOMPoint) {
    g.DOMPoint = class DOMPoint {};
  }

  if (!g.DOMRect) {
    g.DOMRect = class DOMRect {};
  }
}
