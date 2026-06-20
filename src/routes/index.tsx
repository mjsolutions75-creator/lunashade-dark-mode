import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LunaShade — Elegant Dark Mode for Chrome" },
      {
        name: "description",
        content:
          "A premium, lightweight dark mode for the web. Smart theming, per-site control, brightness & contrast. Privacy-first. Manifest V3.",
      },
      { property: "og:title", content: "LunaShade — Elegant Dark Mode for Chrome" },
      {
        property: "og:description",
        content:
          "Smart dark mode that preserves images, video and layout. Per-site control. Privacy-first. No telemetry.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const download = () => {
    fetch("/lunashade.zip")
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "lunashade.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err) => alert(err.message));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(800px 400px at 15% -10%, rgba(124,92,255,0.35), transparent 60%), radial-gradient(700px 400px at 110% 10%, rgba(167,139,250,0.25), transparent 60%)",
          }}
        />
        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2">
            <div
              className="grid h-9 w-9 place-items-center rounded-xl border"
              style={{
                background:
                  "linear-gradient(135deg, rgba(167,139,250,0.3), rgba(124,92,255,0.2))",
                borderColor: "rgba(255,255,255,0.14)",
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <path
                  d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"
                  fill="url(#g)"
                />
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="24" y2="24">
                    <stop offset="0%" stopColor="#A78BFA" />
                    <stop offset="100%" stopColor="#7C5CFF" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="font-semibold tracking-tight">LunaShade</span>
          </div>
          <button
            onClick={download}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:brightness-110"
            style={{
              background: "linear-gradient(135deg, #A78BFA, #7C5CFF)",
              boxShadow: "0 10px 30px -10px rgba(124,92,255,0.6)",
            }}
          >
            Download
          </button>
        </header>

        <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-16 text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#7C5CFF" }} />
            v1.0.0 · Manifest V3 · Chrome / Edge / Brave / Arc
          </p>
          <h1 className="mx-auto max-w-3xl text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
            A dark mode the web{" "}
            <span
              style={{
                background: "linear-gradient(135deg,#A78BFA,#7C5CFF)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              actually deserves.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            LunaShade brings a beautiful, carefully tuned dark theme to every
            website — preserving images, video and layout, with per-site
            control and tunable brightness & contrast.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={download}
              className="rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-xl transition hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, #A78BFA, #7C5CFF)",
                boxShadow: "0 16px 40px -12px rgba(124,92,255,0.7)",
              }}
            >
              Download LunaShade (.zip)
            </button>
            <a
              href="#install"
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium backdrop-blur transition hover:bg-white/10"
            >
              How to install
            </a>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Free · No account · No tracking
          </p>
        </section>
      </div>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-16 md:grid-cols-3">
        {[
          {
            title: "Smart theming engine",
            body: "Preserves images, video, SVG and canvas. No more ghostly pictures or inverted logos.",
          },
          {
            title: "Per-site control",
            body: "Global mode themes everything. Allowlist mode opts in site-by-site. One-click overrides from the popup.",
          },
          {
            title: "Brightness & contrast",
            body: "Fine-tune the look to match your monitor and your eyes, with live preview as you drag.",
          },
          {
            title: "Privacy-first",
            body: "No accounts. No analytics. No telemetry. Settings sync through your own Chrome account.",
          },
          {
            title: "Fast & lightweight",
            body: "Vanilla JS, Manifest V3, minimal permissions. Optimized for large and dynamic sites.",
          },
          {
            title: "Premium UI",
            body: "Glass-inspired popup with smooth animations, polished typography, and a distinct identity.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:border-white/20 hover:bg-white/[0.07]"
          >
            <h3 className="font-semibold tracking-tight">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <section id="install" className="mx-auto max-w-3xl px-6 pb-24">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">Install in 30 seconds</h2>
          <ol className="mt-5 space-y-3 text-sm text-muted-foreground">
            <li>
              <span className="mr-2 inline-block rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold text-foreground">
                1
              </span>
              Click <span className="text-foreground">Download LunaShade (.zip)</span> and unzip the folder.
            </li>
            <li>
              <span className="mr-2 inline-block rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold text-foreground">
                2
              </span>
              Open <code className="rounded bg-black/40 px-1.5 py-0.5 text-foreground">chrome://extensions</code> in your browser.
            </li>
            <li>
              <span className="mr-2 inline-block rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold text-foreground">
                3
              </span>
              Enable <span className="text-foreground">Developer mode</span> (top-right).
            </li>
            <li>
              <span className="mr-2 inline-block rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold text-foreground">
                4
              </span>
              Click <span className="text-foreground">Load unpacked</span> and select the unzipped folder.
            </li>
            <li>
              <span className="mr-2 inline-block rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold text-foreground">
                5
              </span>
              Pin LunaShade to your toolbar — you're done.
            </li>
          </ol>
          <p className="mt-5 text-xs text-muted-foreground">
            Works in Chrome, Edge, Brave, Arc, Vivaldi and Opera.
          </p>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-muted-foreground">
        LunaShade · v1.0.0 · Made with care
      </footer>
    </div>
  );
}
