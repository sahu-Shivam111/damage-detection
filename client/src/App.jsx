import { useEffect, useRef, useState } from "react";

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
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Preview URL for the selected / captured image
  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  // Stop the camera when the component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Attach the stream AFTER the <video> element has mounted
  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOpen]);

  async function openCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Webcam is not supported in this browser.");
      return;
    }

    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });

      streamRef.current = stream;
      setCameraReady(false);
      setCameraOpen(true); // the effect above attaches the stream once the video mounts
    } catch (cameraError) {
      setCameraOpen(false);
      setCameraReady(false);
      setError(
        "Unable to access the webcam. Please allow camera permission or upload an image instead."
      );
      console.error(cameraError);
    }
  }

  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
    setCameraReady(false);
  }

  function capturePhoto() {
    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("Camera is not ready yet.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Could not capture the webcam image.");
          return;
        }

        const imageFile = new File([blob], `webcam-${Date.now()}.jpg`, {
          type: "image/jpeg"
        });

        setFile(imageFile);
        setResult(null);
        setError("");
        closeCamera();
      },
      "image/jpeg",
      0.9
    );
  }

  async function inspect(event) {
    event?.preventDefault();
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
            Upload an image or capture one from your webcam to detect objects,
            estimate condition, and review inspection results with highlighted
            bounding boxes.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
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
                  const selected = event.target.files?.[0] || null;
                  setFile(selected);
                  setResult(null);
                  setError("");
                }}
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
              <button
                type="button"
                onClick={cameraOpen ? closeCamera : openCamera}
                disabled={busy}
                className="inline-flex items-center justify-center rounded-2xl border border-sky-500/50 bg-sky-500/10 px-5 py-3 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cameraOpen ? "Close camera" : "Use webcam"}
              </button>

              <button
                type="button"
                onClick={inspect}
                disabled={!file || busy}
                className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {busy ? "Inspecting…" : "Inspect image"}
              </button>
            </div>
          </div>

          {cameraOpen && (
            <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                  Camera preview
                </h2>
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={!cameraReady}
                  className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Capture photo
                </button>
              </div>

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => setCameraReady(true)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900"
              />

              {!cameraReady && (
                <p className="mt-3 text-sm text-slate-400">Starting camera…</p>
              )}
            </div>
          )}

          {previewUrl && (
            <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                  Selected image
                </h2>
                <span className="text-xs text-slate-400">{file?.name}</span>
              </div>

              <img
                src={previewUrl}
                alt="Selected preview"
                className="max-h-72 w-full rounded-xl border border-slate-700 object-contain"
              />
            </div>
          )}

          {error && (
            <div
              className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              role="alert"
            >
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
                  <div
                    key={label}
                    className={`rounded-2xl border border-slate-700 px-3 py-2 ${style}`}
                  >
                    <div className="text-[10px] uppercase tracking-[0.18em] opacity-80">
                      {label}
                    </div>
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
              <h2 className="mb-4 text-lg font-semibold text-white">
                Inspection details
              </h2>

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
                AI estimates only. “No visible damage” does not certify that an
                item is undamaged.
              </p>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}