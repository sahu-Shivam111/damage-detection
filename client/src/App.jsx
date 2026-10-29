import { useState } from "react";

const colors = {
  damaged: "#f87171",
  no_visible_damage: "#4ade80",
  uncertain: "#fbbf24"
};

const labels = {
  damaged: "Visible damage",
  no_visible_damage: "No visible damage",
  uncertain: "Uncertain"
};

export default function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function inspect(event) {
    event.preventDefault();
    if (!file || busy) return;

    setBusy(true);
    setError("");
    setResult(null);

    try {
      const form = new FormData();
      form.append("image", file);

      const response = await fetch("http://localhost:5000/api/inspect", {
        method: "POST",
        body: form
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Inspection failed.");

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
                Vision inspection
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                Object Count & Damage Detection
              </h1>
            </div>

            <div className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
              AI-powered review
            </div>
          </div>

          <p className="mt-4 max-w-2xl text-sm text-slate-300 md:text-base">
            Upload an image to detect objects, estimate condition, and review inspection results with highlighted bounding boxes.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20 md:p-7">
          <form onSubmit={inspect} className="flex flex-col gap-4 md:flex-row md:items-center">
            <label className="group flex w-full cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-4 transition hover:border-sky-500 hover:bg-slate-900">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Upload image
              </span>
              <span className="text-sm text-slate-200">
                {file ? file.name : "Choose a JPEG, PNG, or WebP file"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                className="hidden"
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null);
                  setResult(null);
                  setError("");
                }}
              />
            </label>

            <button
              type="submit"
              disabled={!file || busy}
              className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {busy ? "Inspecting…" : "Inspect image"}
            </button>
          </form>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">
              {error}
            </div>
          )}
        </section>

        {result && (
          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/20 md:p-5">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                {[
                  ["Total", result.counts.total, "bg-sky-500/15 text-sky-300"],
                  ["Damaged", result.counts.damaged, "bg-red-500/15 text-red-300"],
                  ["No damage", result.counts.noVisibleDamage, "bg-emerald-500/15 text-emerald-300"],
                  ["Uncertain", result.counts.uncertain, "bg-amber-500/15 text-amber-300"]
                ].map(([label, value, style]) => (
                  <div key={label} className={`rounded-2xl border border-slate-700 px-3 py-2 ${style}`}>
                    <div className="text-[10px] uppercase tracking-[0.18em] opacity-80">{label}</div>
                    <div className="mt-1 text-xl font-bold">{value}</div>
                  </div>
                ))}
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                <img
                  src={result.image}
                  alt="Inspected objects"
                  className="h-auto w-full object-contain"
                />

                <svg
                  viewBox="0 0 1000 1000"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute inset-0 h-full w-full"
                >
                  {result.objects.map((object) => {
                    const [y1, x1, y2, x2] = object.box;
                    const color = colors[object.condition];

                    return (
                      <g key={object.id}>
                        <rect
                          x={x1}
                          y={y1}
                          width={x2 - x1}
                          height={y2 - y1}
                          fill="none"
                          stroke={color}
                          strokeWidth="3"
                          vectorEffect="non-scaling-stroke"
                        />
                        <text
                          x={x1 + 5}
                          y={Math.min(y1 + 28, 990)}
                          fill="white"
                          stroke="black"
                          strokeWidth="3"
                          paintOrder="stroke"
                          fontSize="25"
                        >
                          #{object.id}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            <aside className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
              <h2 className="mb-4 text-lg font-semibold text-white">Inspection details</h2>

              <ol className="space-y-3">
                {result.objects.map((object) => (
                  <li
                    key={object.id}
                    className="rounded-2xl border border-slate-700 bg-slate-950/70 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-white">
                        #{object.id} {object.name}
                      </div>
                      <span
                        className="rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                        style={{
                          color: colors[object.condition],
                          backgroundColor: `${colors[object.condition]}22`
                        }}
                      >
                        {labels[object.condition]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{object.reason}</p>
                  </li>
                ))}
              </ol>

              <p className="mt-5 text-xs leading-5 text-slate-400">
                AI estimates only. “No visible damage” does not certify that an item is undamaged.
              </p>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}
