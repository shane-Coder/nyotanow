"use client";

import "./globals.css";

/**
 * Only renders when the root layout itself fails, so it replaces the whole
 * document and cannot use the app's fonts or chrome. Styles are inline because
 * a failure this deep is exactly when you can't assume the stylesheet loaded.
 *
 * Nothing is reported from here: the browser SDK is deliberately not shipped,
 * so a capture call would be a no-op. The server-side error that caused this
 * is already reported by onRequestError in src/instrumentation.ts.
 */
export default function GlobalError() {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.5rem", background: "#fdfaf6", color: "#292524", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
        <main>
          <span style={{ fontSize: "3.5rem" }}>💌</span>
          <h1 style={{ margin: "1rem 0 0", fontSize: "1.75rem" }}>Something went wrong</h1>
          <p style={{ margin: "0.5rem 0 0", color: "#57534e" }}>
            Sorry about that. Please try again in a moment.
          </p>
          {/* A full page load, not a client transition: the app shell is the thing that just broke. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{ display: "inline-block", marginTop: "2rem", padding: "0.75rem 1.5rem", borderRadius: "9999px", background: "#ea580c", color: "#fff", fontWeight: 700, textDecoration: "none" }}
          >
            Back to NyotaNow
          </a>
        </main>
      </body>
    </html>
  );
}
