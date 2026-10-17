"use client";

import { useEffect } from "react";

/**
 * Catches errors thrown by the root layout itself (auth + category query)
 * for the whole document. It replaces the root layout, so it renders its
 * own <html>/<body>, and uses CSS system colors instead of the app's theme
 * variables (global-error does not inherit the theme class).
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100dvh",
          margin: 0,
          display: "grid",
          placeItems: "center",
          background: "Canvas",
          color: "CanvasText",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ padding: "1.5rem" }}>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem" }}>
            Something went wrong
          </h2>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", opacity: 0.7 }}>
            The app failed to load. Try again, and check the server logs if this
            keeps happening.
          </p>
          {error.digest && (
            <p
              style={{
                margin: "0 0 0.75rem",
                fontSize: "0.75rem",
                opacity: 0.7,
                fontFamily: "monospace",
              }}
            >
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={() => retry()}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid currentColor",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
