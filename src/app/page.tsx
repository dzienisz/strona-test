"use client";

import WavesBackground from "./components/WavesBackground";

export default function Home() {
  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        color: "#e8e8e8",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        overflow: "hidden",
      }}
    >
      <WavesBackground />

      {/* Nav */}
      <nav
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "2rem 3rem",
        }}
      >
        <span
          style={{
            fontSize: "0.8rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(232, 232, 232, 0.45)",
            fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
            fontWeight: 400,
          }}
        >
          Studio
        </span>

      </nav>

      {/* Hero */}
      <section
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 7rem)",
          padding: "0 2rem",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "0.7rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(160, 180, 210, 0.5)",
            fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
            fontWeight: 400,
            marginBottom: "2.5rem",
          }}
        >
          Coming soon
        </p>

        <h1
          style={{
            fontSize: "clamp(3rem, 8vw, 7.5rem)",
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "rgba(232, 232, 232, 0.88)",
            margin: "0 0 2rem",
            maxWidth: "14ch",
          }}
        >
          Something
          <br />
          is coming.
        </h1>

        <p
          style={{
            fontSize: "clamp(0.95rem, 1.8vw, 1.15rem)",
            lineHeight: 1.75,
            color: "rgba(232, 232, 232, 0.38)",
            maxWidth: "42ch",
            fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
            fontWeight: 300,
            letterSpacing: "0.01em",
            margin: "0 0 4rem",
          }}
        >
          We&apos;re working on something new. Stay tuned.
        </p>

        <a
          href="#"
          style={{
            fontSize: "0.72rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(160, 180, 210, 0.6)",
            fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
            fontWeight: 400,
            textDecoration: "none",
            borderBottom: "1px solid rgba(160, 180, 210, 0.25)",
            paddingBottom: "0.25rem",
            transition: "color 0.3s ease, border-color 0.3s ease",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.color = "rgba(160, 180, 210, 1)";
            el.style.borderBottomColor = "rgba(160, 180, 210, 0.6)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.color = "rgba(160, 180, 210, 0.6)";
            el.style.borderBottomColor = "rgba(160, 180, 210, 0.25)";
          }}
        >
          Get notified
        </a>
      </section>

      {/* Footer */}
      <footer
        style={{
          position: "relative",
          zIndex: 10,
          padding: "2rem 3rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "0.68rem",
            letterSpacing: "0.1em",
            color: "rgba(232, 232, 232, 0.18)",
            fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
          }}
        >
          © 2026
        </span>
      </footer>
    </main>
  );
}
