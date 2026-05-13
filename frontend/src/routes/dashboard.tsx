import { createFileRoute, Link } from "@tanstack/react-router";
import { aiModels } from "@/lib/ai-models";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Upload,
  FileText,
  Sparkles,
  History,
  ImageIcon,
  CheckCircle2,
  ArrowLeft,
  Headphones,
  Video,
  Type,
  Activity,
  ShieldCheck,
  Crosshair,
  Eye,
  Volume2,
  AlertTriangle,
} from "lucide-react";
import { z } from "zod";
import {
  backendUrl,
  runBackendAnalysis,
  type AudioAnalysisOptions,
  type FaceResult,
  type HeartbeatResult,
  type MediaSafetyCheck,
  type MediaSafetyOptions,
  type MediaSafetyResult,
  type ModelAnalysisResult,
  type PropagationResult,
  type VideoObjectDetectionResult,
  type WeaponResult,
} from "@/lib/backend-api";

const search = z.object({ model: z.string().optional() });

export const Route = createFileRoute("/dashboard")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Dashboard IA - AURA" },
      {
        name: "description",
        content: "Analysez images, videos, audio et documents avec les modeles IA AURA.",
      },
    ],
  }),
  component: DashboardPage,
});

type Analysis = {
  id: string;
  modelSlug: string;
  modelName: string;
  type: "image" | "audio" | "document" | "video" | "text" | "structured" | "media";
  preview: string;
  score: number;
  label: string;
  details: string[];
  answer?: string;
  raw: ModelAnalysisResult;
  date: string;
};

type AudioBooleanOption = Exclude<keyof AudioAnalysisOptions, "whisperModel">;

const audioOptionControls: { key: AudioBooleanOption; label: string }[] = [
  { key: "transcription", label: "Transcription" },
  { key: "speakerGrouping", label: "Regroupement vocal" },
  { key: "pyannoteDiarization", label: "Diarisation Pyannote" },
  { key: "hfEmotion", label: "Emotion HF" },
  { key: "hfDeepfake", label: "Deepfake HF" },
  { key: "acousticContext", label: "Contexte acoustique" },
  { key: "integrity", label: "Integrite audio" },
  { key: "xai", label: "References XAI" },
];

const mediaSafetyChecks: {
  key: MediaSafetyCheck;
  label: string;
  description: string;
  color: string;
  icon: typeof ShieldCheck;
}[] = [
  {
    key: "violence",
    label: "Violence",
    description: "Image et video",
    color: "border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-700",
    icon: ShieldCheck,
  },
  {
    key: "threat",
    label: "Menace",
    description: "Image et video",
    color: "border-amber-500 bg-amber-500/10 text-amber-700",
    icon: AlertTriangle,
  },
  {
    key: "weapons",
    label: "Armes",
    description: "Boites sur image/video",
    color: "border-red-500 bg-red-500/10 text-red-700",
    icon: Crosshair,
  },
  {
    key: "faces",
    label: "Visages",
    description: "Boites sur image/video",
    color: "border-sky-500 bg-sky-500/10 text-sky-700",
    icon: Eye,
  },
  {
    key: "audio",
    label: "Signaux audio",
    description: "Audio seul ou video avec son",
    color: "border-emerald-500 bg-emerald-500/10 text-emerald-700",
    icon: Volume2,
  },
];

const mediaSafetyColors: Record<MediaSafetyCheck, string> = {
  violence: "bg-fuchsia-500",
  threat: "bg-amber-500",
  weapons: "bg-red-500",
  faces: "bg-sky-500",
  audio: "bg-emerald-500",
};

const defaultMediaSafetyOptions: MediaSafetyOptions = {
  violence: true,
  threat: true,
  weapons: true,
  faces: true,
  audio: true,
};
const audioDisplayThreshold = 0.6;

const propagationFeatureLabels: Record<string, string> = {
  src_score: "Source",
  deepfake_score: "Deepfake",
  violence_score: "Violence",
  manip_risk: "Manipulation",
  social_risk: "Social",
  law_score: "Legal",
  digital_pen: "Digital",
  is_sexual: "Sexuel",
  is_minor: "Mineur",
  is_public: "Public",
  is_organized: "Organise",
  hour_posted: "Heure",
  day_of_week: "Jour",
};

const propagationDefaultFeatures = Object.fromEntries(
  Object.keys(propagationFeatureLabels).map((key) => [key, 0]),
) as Record<string, number>;

const heartbeatBaseFeatureLabels = Object.fromEntries(
  Array.from({ length: 35 }, (_, index) => {
    const key = `hrv_${String(index + 1).padStart(2, "0")}`;
    return [key, `HRV ${index + 1}`];
  }),
) as Record<string, string>;

const heartbeatAuxFeatureLabels = Object.fromEntries(
  Array.from({ length: 12 }, (_, index) => {
    const key = `aux_${String(index + 1).padStart(2, "0")}`;
    return [key, `Aux ${index + 1}`];
  }),
) as Record<string, string>;

const heartbeatFeatureLabels = {
  ...heartbeatBaseFeatureLabels,
  ...heartbeatAuxFeatureLabels,
};

const heartbeatDefaultFeatures = Object.fromEntries(
  Object.keys(heartbeatFeatureLabels).map((key) => [key, 0]),
) as Record<string, number>;

const heartbeatDefaultSignal = Array.from({ length: 16 }, () => 0);

function DashboardPage() {
  const { model } = Route.useSearch();
  const [selected] = useState(model ?? aiModels[0].slug);
  const current = useMemo(
    () => aiModels.find((m) => m.slug === selected) ?? aiModels[0],
    [selected],
  );
  const [file, setFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");
  const [question, setQuestion] = useState("");
  const [textInput, setTextInput] = useState("");
  const [propagationFeatures, setPropagationFeatures] = useState<Record<string, number>>(
    propagationDefaultFeatures,
  );
  const [heartbeatFeatures, setHeartbeatFeatures] = useState<Record<string, number>>(
    heartbeatDefaultFeatures,
  );
  const [heartbeatSignal, setHeartbeatSignal] = useState<number[]>(heartbeatDefaultSignal);
  const [history, setHistory] = useState<Analysis[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [latest, setLatest] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioOptions, setAudioOptions] = useState<AudioAnalysisOptions>({
    transcription: false,
    whisperModel: "tiny",
    speakerGrouping: true,
    pyannoteDiarization: false,
    hfEmotion: false,
    hfDeepfake: false,
    acousticContext: true,
    integrity: true,
    xai: true,
  });
  const [mediaSafetyOptions, setMediaSafetyOptions] =
    useState<MediaSafetyOptions>(defaultMediaSafetyOptions);

  function setAudioBooleanOption(key: AudioBooleanOption, value: boolean) {
    setAudioOptions((options) => ({ ...options, [key]: value }));
  }

  useEffect(() => {
    if (!file || (current.input !== "image" && !(current.input === "media" && fileKind(file) === "image"))) {
      setImagePreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [current.input, file]);

  useEffect(() => {
    if (!file || (current.input !== "video" && !(current.input === "media" && fileKind(file) === "video"))) {
      setVideoPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [current.input, file]);

  useEffect(() => {
    if (!file || (current.input !== "audio" && !(current.input === "media" && fileKind(file) === "audio"))) {
      setAudioPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setAudioPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [current.input, file]);

  async function runAnalysis(type: Analysis["type"]) {
    if (requiresFile(current.input) && !file) return;
    if (current.input === "text" && !textInput.trim()) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await runBackendAnalysis(
        current,
        file,
        question,
        audioOptions,
        textInput,
        propagationFeatures,
        heartbeatFeatures,
        heartbeatSignal,
        mediaSafetyOptions,
      );
      const summary = summarizeResult(result);
      const analysis: Analysis = {
        id: crypto.randomUUID(),
        modelSlug: current.slug,
        modelName: current.name,
        type,
        preview:
          file?.name ??
          (current.input === "text"
            ? "Texte"
            : current.input === "structured"
              ? current.slug === "biometric_heartbeat_detection"
                ? "Signaux cardiaques"
                : "Signaux de propagation"
              : ""),
        score: summary.score,
        label: summary.label,
        details: summary.details,
        answer: summary.answer,
        raw: result,
        date: new Date().toLocaleString("fr-FR"),
      };
      setHistory((items) => [analysis, ...items].slice(0, 8));
      setLatest(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analyse impossible.");
    } finally {
      setAnalyzing(false);
    }
  }

  const inputTitle =
    current.input === "media"
      ? "Importer un media"
      : current.input === "image"
      ? "Importer une image"
      : current.input === "audio"
        ? "Importer un audio"
        : current.input === "video"
          ? "Importer une video"
          : current.input === "text"
            ? "Coller un texte"
            : current.input === "structured"
              ? current.slug === "biometric_heartbeat_detection"
                ? "Renseigner les donnees cardiaques"
                : "Renseigner les signaux"
              : "Importer un document";

  const inputDescription =
    current.input === "media"
      ? "Formats acceptes: images, videos et audios."
      : current.input === "image"
      ? "Formats acceptes: JPG, PNG, WEBP."
      : current.input === "audio"
        ? "Formats acceptes: MP3, WAV, M4A."
        : current.input === "video"
          ? "Formats acceptes: MP4, MOV, WEBM."
          : current.input === "text"
            ? "Texte brut analyse directement par le modele."
            : current.input === "structured"
              ? current.slug === "biometric_heartbeat_detection"
                ? "Valeurs numeriques HRV, auxiliaires et signal compact."
                : "Valeurs numeriques envoyees au modele de propagation."
              : "Formats acceptes: PDF, images, documents.";

  const InputIcon =
    current.input === "media"
      ? ShieldCheck
      : current.input === "audio"
      ? Headphones
      : current.input === "video"
        ? Video
        : current.input === "document"
          ? FileText
          : current.input === "text"
            ? Type
            : current.input === "structured"
              ? Activity
              : ImageIcon;

  const disableRun =
    analyzing ||
    (requiresFile(current.input) && !file) ||
    (current.input === "text" && !textInput.trim()) ||
    (current.slug === "media_safety_scan" &&
      !Object.entries(mediaSafetyAvailability(file)).some(
        ([key, available]) => available && mediaSafetyOptions[key as MediaSafetyCheck],
      ));

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 text-base">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/models"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline motion-link"
          >
            <ArrowLeft className="size-4" aria-hidden /> Retour aux outils
          </Link>
          <p className="mt-4 text-base font-medium text-primary">Outil</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-display">{current.name}</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Preparez l'entree requise pour lancer une analyse.
          </p>
        </div>
      </header>

      <div className="mt-8 grid lg:grid-cols-3 gap-7 max-w-6xl mx-auto">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 motion-card">
            <div className="flex items-center gap-3">
              <span
                className={`grid place-items-center size-10 rounded-xl motion-icon ${current.accent}`}
              >
                <current.icon className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-semibold">{current.name}</h2>
                <p className="text-xs text-muted-foreground">{current.description}</p>
              </div>
            </div>

            <div className={`mt-6 grid gap-4 ${current.slug === "media_safety_scan" ? "" : "sm:grid-cols-2"}`}>
              <div
                className={`rounded-2xl border border-dashed border-border p-4 motion-card ${
                  current.slug === "media_safety_scan" ? "mx-auto w-full max-w-3xl" : ""
                }`}
              >
                <p className="flex items-center gap-2 text-base font-semibold">
                  <InputIcon className="size-4 text-primary" aria-hidden />
                  {inputTitle}
                </p>
                <p className="mt-1 text-base text-muted-foreground">{inputDescription}</p>
                {requiresFile(current.input) && (
                  <>
                    <label
                      htmlFor="file-input"
                      className={`mt-3 grid place-items-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 cursor-pointer hover:bg-muted transition-colors text-lg text-muted-foreground motion-button ${
                        current.slug === "media_safety_scan" ? "h-40" : "h-32"
                      }`}
                    >
                      <Upload className="size-5" aria-hidden />
                      <span className="max-w-full truncate px-3">
                        {file?.name ?? "Glissez ou cliquez pour televerser"}
                      </span>
                    </label>
                    <input
                      id="file-input"
                      type="file"
                      accept={current.accept}
                      className="sr-only"
                      onChange={(event) => {
                        const nextFile = event.target.files?.[0] ?? null;
                        setFile(nextFile);
                        if (current.slug === "media_safety_scan") {
                          setMediaSafetyOptions(defaultChecksForFile(nextFile));
                        }
                        setLatest(null);
                        setError(null);
                      }}
                    />
                    {current.slug === "media_safety_scan" && file && (
                      <MediaFilePreview
                        file={file}
                        imageUrl={imagePreviewUrl}
                        videoUrl={videoPreviewUrl}
                        audioUrl={audioPreviewUrl}
                      />
                    )}
                  </>
                )}
                {current.input === "text" && (
                  <textarea
                    value={textInput}
                    onChange={(event) => {
                      setTextInput(event.target.value);
                      setLatest(null);
                      setError(null);
                    }}
                    rows={8}
                    placeholder="Collez le texte a analyser..."
                    className="mt-3 w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-base focus-visible:ring-2 focus-visible:ring-ring motion-focus"
                  />
                )}
                {current.input === "structured" && current.slug === "propagation_prediction" && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {Object.keys(propagationFeatureLabels).map((key) => (
                      <label key={key} className="block">
                        <span className="text-sm font-medium text-muted-foreground">
                          {propagationFeatureLabels[key]}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={propagationFeatures[key] ?? 0}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            setPropagationFeatures((features) => ({
                              ...features,
                              [key]: Number.isFinite(value) ? value : 0,
                            }));
                            setLatest(null);
                            setError(null);
                          }}
                          className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-base focus-visible:ring-2 focus-visible:ring-ring motion-focus"
                        />
                      </label>
                    ))}
                  </div>
                )}
                {current.input === "structured" &&
                  current.slug === "biometric_heartbeat_detection" && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-sm font-semibold">HRV</p>
                        <div className="mt-2 grid gap-3 sm:grid-cols-3">
                          {Object.keys(heartbeatBaseFeatureLabels).map((key) => (
                            <NumberField
                              key={key}
                              label={heartbeatBaseFeatureLabels[key]}
                              value={heartbeatFeatures[key] ?? 0}
                              onChange={(value) => {
                                setHeartbeatFeatures((features) => ({ ...features, [key]: value }));
                                setLatest(null);
                                setError(null);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Auxiliaires</p>
                        <div className="mt-2 grid gap-3 sm:grid-cols-3">
                          {Object.keys(heartbeatAuxFeatureLabels).map((key) => (
                            <NumberField
                              key={key}
                              label={heartbeatAuxFeatureLabels[key]}
                              value={heartbeatFeatures[key] ?? 0}
                              onChange={(value) => {
                                setHeartbeatFeatures((features) => ({ ...features, [key]: value }));
                                setLatest(null);
                                setError(null);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Signal</p>
                        <div className="mt-2 grid gap-3 sm:grid-cols-4">
                          {heartbeatSignal.map((value, index) => (
                            <NumberField
                              key={`signal-${index}`}
                              label={`S${index + 1}`}
                              value={value}
                              onChange={(nextValue) => {
                                setHeartbeatSignal((items) =>
                                  items.map((item, itemIndex) =>
                                    itemIndex === index ? nextValue : item,
                                  ),
                                );
                                setLatest(null);
                                setError(null);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                {current.input === "document" && (
                  <div className="mt-3">
                    <label
                      htmlFor="question-input"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      Question (optionnelle)
                    </label>
                    <input
                      id="question-input"
                      type="text"
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder="Posez une question sur le document..."
                      className="mt-2 w-full h-11 rounded-xl border border-border bg-background px-3 text-base focus-visible:ring-2 focus-visible:ring-ring motion-focus"
                    />
                  </div>
                )}
                {current.slug === "media_safety_scan" && (
                  <MediaSafetyControls
                    file={file}
                    options={mediaSafetyOptions}
                    onChange={(key, value) =>
                      setMediaSafetyOptions((items) => ({ ...items, [key]: value }))
                    }
                  />
                )}
                {(current.input === "audio" ||
                  (current.slug === "media_safety_scan" && mediaSafetyOptions.audio)) && (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Options audio</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {audioOptionControls.map((option) => (
                        <label
                          key={option.key}
                          className="flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm motion-button"
                        >
                          <input
                            type="checkbox"
                            checked={audioOptions[option.key]}
                            onChange={(event) =>
                              setAudioBooleanOption(option.key, event.target.checked)
                            }
                            className="size-4 accent-primary"
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                    <label
                      htmlFor="whisper-model"
                      className="block text-sm font-medium text-muted-foreground"
                    >
                      Modele Whisper
                    </label>
                    <select
                      id="whisper-model"
                      value={audioOptions.whisperModel}
                      disabled={!audioOptions.transcription}
                      onChange={(event) =>
                        setAudioOptions((options) => ({
                          ...options,
                          whisperModel: event.target.value as AudioAnalysisOptions["whisperModel"],
                        }))
                      }
                      className="w-full h-11 rounded-xl border border-border bg-background px-3 text-base disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring motion-focus"
                    >
                      <option value="tiny">tiny</option>
                      <option value="base">base</option>
                      <option value="small">small</option>
                    </select>
                  </div>
                )}
                <button
                  onClick={() => runAnalysis(current.input)}
                  disabled={disableRun}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-aura-gradient text-primary-foreground text-base font-semibold shadow-soft disabled:opacity-50 motion-button"
                >
                  <Sparkles className="size-4" aria-hidden /> Lancer l'analyse
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 motion-card">
            <h2 className="font-semibold text-lg">Resultat</h2>
            {!latest && !analyzing && !error && (
              <p className="mt-2 text-base text-muted-foreground">
                Lancez une analyse pour voir la prediction du modele.
              </p>
            )}
            {analyzing && (
              <div className="mt-4 flex items-center gap-3 text-base text-muted-foreground">
                <span className="size-2 rounded-full bg-primary animate-pulse" />
                {current.slug === "media_safety_scan"
                  ? "Analyse en cours... les videos et audios longs peuvent prendre un moment."
                  : "Analyse en cours..."}
              </div>
            )}
            {error && !analyzing && (
              <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-base text-destructive">
                {error}
              </div>
            )}
            {latest && !analyzing && (
              <div className="mt-4 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-muted/40 p-4 motion-in">
                    <p className="text-sm text-muted-foreground">Prediction</p>
                    <p className="mt-1 text-lg font-semibold flex items-center gap-2">
                      <CheckCircle2 className="size-5 text-primary" aria-hidden /> {latest.label}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Modele : {latest.modelName}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-muted/40 p-4 motion-in">
                    <p className="text-sm text-muted-foreground">Score de confiance</p>
                    <p className="mt-1 text-3xl font-display">{latest.score}%</p>
                    <div className="mt-3 h-2 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full bg-aura-gradient"
                        style={{ width: `${latest.score}%` }}
                      />
                    </div>
                  </div>
                </div>
                {isMediaSafetyResult(latest.raw) && (
                  <MediaSafetyPreview
                    result={latest.raw}
                    imageUrl={imagePreviewUrl}
                    videoUrl={videoPreviewUrl}
                    audioUrl={audioPreviewUrl}
                  />
                )}
                {isPropagationResult(latest.raw) && (
                  <PropagationCurvePreview result={latest.raw} />
                )}
                {isHeartbeatResult(latest.raw) && <HeartbeatBreakdownPreview result={latest.raw} />}
                {latest.details.length > 0 && !isMediaSafetyResult(latest.raw) && (
                  <div className="rounded-2xl bg-muted/40 p-4 motion-in">
                    <p className="text-sm font-semibold">Details</p>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {latest.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {latest.answer && (
                  <div className="rounded-2xl bg-muted/40 p-4 motion-in">
                    <p className="text-sm font-semibold">Reponse</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                      {latest.answer}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-3xl border border-border bg-card p-6 h-fit motion-card">
          <h2 className="font-semibold flex items-center gap-2 text-lg">
            <History className="size-4 text-primary" aria-hidden /> Historique
          </h2>
          {history.length === 0 ? (
            <p className="mt-3 text-base text-muted-foreground">Aucune analyse pour le moment.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {history.map((item) => (
                <li key={item.id} className="rounded-2xl border border-border p-3 motion-card">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-primary">{item.modelName}</span>
                    <span className="text-sm text-muted-foreground">{item.score}%</span>
                  </div>
                  <p className="mt-1 text-base truncate">
                    {item.preview ||
                      (item.type === "audio"
                        ? "Audio"
                        : item.type === "video"
                          ? "Video"
                          : item.type === "document"
                            ? "Document"
                            : "Image")}
                  </p>
                  <p className="text-sm text-muted-foreground">{item.date}</p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          onChange(Number.isFinite(nextValue) ? nextValue : 0);
        }}
        className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-base focus-visible:ring-2 focus-visible:ring-ring motion-focus"
      />
    </label>
  );
}

function MediaFilePreview({
  file,
  imageUrl,
  videoUrl,
  audioUrl,
}: {
  file: File;
  imageUrl: string;
  videoUrl: string;
  audioUrl: string;
}) {
  const kind = fileKind(file);

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-background">
      {kind === "image" && imageUrl && (
        <img src={imageUrl} alt="Media importe" className="max-h-72 w-full object-contain" />
      )}
      {kind === "video" && videoUrl && (
        <video src={videoUrl} controls className="aspect-video w-full bg-black" />
      )}
      {kind === "audio" && audioUrl && (
        <div className="p-4">
          <audio src={audioUrl} controls className="w-full" />
        </div>
      )}
    </div>
  );
}

function MediaSafetyControls({
  file,
  options,
  onChange,
}: {
  file: File | null;
  options: MediaSafetyOptions;
  onChange: (key: MediaSafetyCheck, value: boolean) => void;
}) {
  const availability = mediaSafetyAvailability(file);

  return (
    <div className="mt-5 rounded-2xl border border-border bg-background p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Controles a lancer</p>
          <p className="text-xs text-muted-foreground">
            Les options impossibles sont desactivees selon le type du fichier.
          </p>
        </div>
        {file && (
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {fileKind(file)}
          </span>
        )}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {mediaSafetyChecks.map((check) => {
          const Icon = check.icon;
          const disabled = !availability[check.key];

          return (
            <label
              key={check.key}
              className={`flex min-h-20 items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
                disabled
                  ? "border-border bg-muted/40 opacity-55"
                  : options[check.key]
                    ? check.color
                    : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              <input
                type="checkbox"
                checked={options[check.key] && !disabled}
                disabled={disabled}
                onChange={(event) => onChange(check.key, event.target.checked)}
                className="size-4 accent-primary"
              />
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{check.label}</span>
                <span className="block text-xs text-muted-foreground">{check.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function PropagationCurvePreview({ result }: { result: PropagationResult }) {
  const curve = result.transformer.propagation_curve;
  const max = Math.max(...curve, 0.001);

  return (
    <div className="rounded-2xl bg-muted/40 p-4 motion-in">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Courbe de propagation</p>
        <span className="text-sm text-muted-foreground">
          {result.transformer.status === "ready" ? `${curve.length} points` : "Indisponible"}
        </span>
      </div>
      {curve.length > 0 ? (
        <div className="mt-4 flex h-32 items-end gap-1 rounded-2xl border border-border bg-background p-3">
          {curve.map((value, index) => (
            <div
              key={`${index}-${value}`}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
            >
              <div
                className="w-full rounded-t-md bg-aura-gradient motion-in"
                style={{ height: `${Math.max(6, (value / max) * 100)}%` }}
                title={`T${index + 1}: ${toPercent(value)}%`}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Le modele XGBoost est pret. Le transformer sera actif quand TensorFlow/Keras est installe.
        </p>
      )}
    </div>
  );
}

function HeartbeatBreakdownPreview({ result }: { result: HeartbeatResult }) {
  const rows = [
    { name: "Classifieur calibre", scores: result.scores },
    { name: "Random forest", scores: result.random_forest_scores },
    { name: "Sequence", scores: result.sequence.scores },
  ];

  return (
    <div className="rounded-2xl bg-muted/40 p-4 motion-in">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Modeles cardiaques</p>
        <span className="text-sm text-muted-foreground">
          {result.input.base_feature_count + result.input.auxiliary_feature_count} features
        </span>
      </div>
      <div className="mt-3 grid gap-3">
        {rows.map((row) => (
          <div key={row.name} className="rounded-xl border border-border bg-background p-3">
            <p className="text-sm font-medium">{row.name}</p>
            <div className="mt-2 space-y-2">
              {Object.entries(row.scores).map(([label, value]) => (
                <div key={`${row.name}-${label}`}>
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="truncate">{label}</span>
                    <span>{toPercent(value)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                    <div className="h-full bg-aura-gradient" style={{ width: `${toPercent(value)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MediaSafetyPreview({
  result,
  imageUrl,
  videoUrl,
  audioUrl,
}: {
  result: MediaSafetyResult;
  imageUrl: string;
  videoUrl: string;
  audioUrl: string;
}) {
  const annotatedImage = result.previews.annotated_image_url
    ? backendUrl(result.previews.annotated_image_url)
    : "";
  const annotatedVideo = result.previews.annotated_video_url
    ? backendUrl(result.previews.annotated_video_url)
    : "";
  const cards = mediaSafetySummaryCards(result);

  return (
    <div className="space-y-6 motion-in">
      <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Preview annotee</p>
          <span className="text-sm text-muted-foreground">
            {result.annotation.available
              ? result.media_type === "video"
                ? `${result.annotation.frame_count} frames`
                : "Image annotee"
              : "Aucune annotation"}
          </span>
        </div>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {result.media_type === "image" && imageUrl && (
            <PreviewPane title="Original">
              <img src={imageUrl} alt="Original" className="max-h-96 w-full object-contain" />
            </PreviewPane>
          )}
          {result.media_type === "image" && annotatedImage && (
            <PreviewPane title="Analyse">
              <img src={annotatedImage} alt="Media annote" className="max-h-96 w-full object-contain" />
            </PreviewPane>
          )}
          {result.media_type === "video" && videoUrl && (
            <PreviewPane title="Original">
              <video src={videoUrl} controls className="aspect-video w-full bg-black" />
            </PreviewPane>
          )}
          {result.media_type === "video" && annotatedVideo && (
            <PreviewPane title="Analyse frame par frame">
              <video src={annotatedVideo} controls className="aspect-video w-full bg-black" />
            </PreviewPane>
          )}
          {result.media_type === "audio" && audioUrl && (
            <PreviewPane title="Audio">
              <div className="p-4">
                <audio src={audioUrl} controls className="w-full" />
              </div>
            </PreviewPane>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <div key={card.key} className="rounded-2xl border border-border bg-card p-4 shadow-sm motion-card">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className={`size-2.5 rounded-full ${mediaSafetyColors[card.key]}`} />
                {card.title}
              </span>
              <span className="text-sm font-semibold text-primary">{card.score}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{card.detail}</p>
          </div>
        ))}
      </section>

      <MediaSafetyObjectList result={result} />
      <MediaSafetyAudioDetails result={result} />

      {result.timeline.length > 0 && (
        <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Timeline</p>
            <span className="text-sm text-muted-foreground">{result.timeline.length} evenement(s)</span>
          </div>
          <div className="mt-3 space-y-2">
            {result.timeline.slice(0, 16).map((item, index) => (
              <div key={`${item.check}-${index}`} className="flex items-center gap-3 text-sm">
                <span className={`size-2.5 rounded-full ${mediaSafetyColors[item.check]}`} />
                <span className="w-24 text-muted-foreground">
                  {formatTimelineRange(item.start, item.end)}
                </span>
                <span className="font-medium">{item.label}</span>
                {typeof item.score === "number" && (
                  <span className="ml-auto text-primary">{toPercent(item.score)}%</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {(result.skipped.length > 0 || result.errors.length > 0) && (
        <section className="rounded-2xl border border-border bg-background p-4 text-sm shadow-sm">
          <p className="font-semibold">Etat des controles</p>
          <div className="mt-2 space-y-1 text-muted-foreground">
            {result.skipped.map((item) => (
              <p key={`skip-${item.check}`}>{item.label}: {item.reason}</p>
            ))}
            {result.errors.map((item) => (
              <p key={`error-${item.check}`}>{item.check}: {item.message}</p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PreviewPane({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-muted/20">
      <p className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function MediaSafetyObjectList({ result }: { result: MediaSafetyResult }) {
  const objectResults = [
    { key: "weapons" as const, title: "Armes", result: result.results.weapons },
    { key: "faces" as const, title: "Visages", result: result.results.faces },
  ].filter((item) => item.result);

  if (objectResults.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <p className="text-sm font-semibold">Boites detectees</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {objectResults.map((item) => (
          <div key={item.key} className="rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className={`size-2.5 rounded-full ${mediaSafetyColors[item.key]}`} />
                {item.title}
              </span>
              <span className="text-sm text-primary">{objectDetectionCount(item.result!)} detection(s)</span>
            </div>
            <div className="mt-2 space-y-2 text-sm text-muted-foreground">
              {objectDetectionRows(item.result!).slice(0, 12).map((row, index) => (
                <p key={`${item.key}-${index}`} className="truncate">
                  {row}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MediaSafetyAudioDetails({ result }: { result: MediaSafetyResult }) {
  const audio = result.results.audio;
  if (!audio) return null;
  const transcripts = audio.timeline
    .map((segment) => segment.transcript?.trim())
    .filter((text): text is string => Boolean(text))
    .slice(0, 4);
  const emotions = audio.timeline
    .flatMap((segment) => segment.hf_emotion?.predictions?.slice(0, 1) ?? [])
    .slice(0, 4);
  const deepfake = audio.timeline
    .flatMap((segment) => segment.hf_deepfake?.predictions?.slice(0, 1) ?? [])
    .slice(0, 4);

  return (
    <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Details audio</p>
        <span className="text-sm text-muted-foreground">
          {audio.summary.segments_processed} segment(s)
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <AudioInfo label="Transcription" value={audio.summary.transcription_status} />
        <AudioInfo label="Diarisation" value={audio.summary.diarization_status} />
        <AudioInfo label="Emotion HF" value={audio.summary.hf_emotion_status} />
        <AudioInfo label="Deepfake HF" value={audio.summary.hf_deepfake_status} />
        <AudioInfo label="Integrite" value={audio.integrity.status} />
        <AudioInfo label="XAI" value={`${audio.xai_reference_count} reference(s)`} />
      </div>
      {transcripts.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-muted/20 p-3">
          <p className="text-sm font-semibold">Transcription</p>
          <div className="mt-2 space-y-2 text-sm text-muted-foreground">
            {transcripts.map((text, index) => (
              <p key={`${index}-${text}`}>{text}</p>
            ))}
          </div>
        </div>
      )}
      {(emotions.length > 0 || deepfake.length > 0) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {emotions.length > 0 && (
            <AudioPredictionList title="Emotions" items={emotions} />
          )}
          {deepfake.length > 0 && (
            <AudioPredictionList title="Deepfake" items={deepfake} />
          )}
        </div>
      )}
    </section>
  );
}

function AudioInfo({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
      <p className="font-medium">{label}</p>
      <p className="mt-1 text-muted-foreground">{value || "n/a"}</p>
    </div>
  );
}

function AudioPredictionList({
  title,
  items,
}: {
  title: string;
  items: { label: string; score: number }[];
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <p key={`${title}-${index}-${item.label}`}>
            {item.label}: {toPercent(item.score)}%
          </p>
        ))}
      </div>
    </div>
  );
}

function summarizeResult(result: ModelAnalysisResult) {
  if (isMediaSafetyResult(result)) {
    const scores = [
      result.results.violence?.confidence,
      result.results.threat?.confidence,
      result.results.audio?.summary.top_event_probability,
    ].filter((value): value is number => typeof value === "number");
    const objectCount =
      objectDetectionCount(result.results.weapons) + objectDetectionCount(result.results.faces);
    const score = scores.length
      ? toPercent(Math.max(...scores))
      : objectCount > 0
        ? 100
        : 0;
    return {
      label:
        result.completed_checks.length > 0
          ? "Analyse terminee"
          : "Aucun controle termine",
      score,
      details: [
        `Type: ${result.media_type}`,
        `Selection: ${result.selected_checks.join(", ")}`,
        `Termines: ${result.completed_checks.join(", ") || "aucun"}`,
        `Annotations: ${result.annotation.available ? "oui" : "non"}`,
        `Ignores: ${result.skipped.length}`,
        `Erreurs: ${result.errors.length}`,
      ],
    };
  }

  if ("sexism_detected" in result) {
    return {
      label: result.sexism_detected ? "Sexisme detecte" : "Non sexiste",
      score: toPercent(result.confidence),
      details: [
        `Score sexiste: ${toPercent(result.scores.sexist)}%`,
        `Score non sexiste: ${toPercent(result.scores.not_sexist)}%`,
        `Image: ${result.original_size[0]}x${result.original_size[1]} vers ${result.input_size[0]}x${result.input_size[1]}`,
      ],
    };
  }

  if ("model" in result && result.model === "image_authenticity_detection") {
    return {
      label: result.ai_generated ? "Image IA ou fake" : "Image reelle",
      score: toPercent(result.confidence),
      details: [
        `Score reel: ${toPercent(result.scores.REAL)}%`,
        `Score IA/fake: ${toPercent(result.scores.AI_GENERATED_OR_FAKE)}%`,
        `Image: ${result.original_size[0]}x${result.original_size[1]} vers ${result.input_size[0]}x${result.input_size[1]}`,
      ],
    };
  }

  if ("model" in result && result.model === "text_authenticity_detection") {
    return {
      label: result.ai_generated ? "Texte genere par IA" : "Texte humain",
      score: toPercent(result.confidence),
      details: [
        `Score humain: ${toPercent(result.scores.HUMAN)}%`,
        `Score IA: ${toPercent(result.scores.AI_GENERATED)}%`,
        `Caracteres: ${result.input.characters}`,
        `Longueur max: ${result.input.max_length} tokens`,
      ],
    };
  }

  if ("model" in result && result.model === "propagation_prediction") {
    return {
      label: `${result.virality_class} / score ${result.virality_score.toFixed(2)}`,
      score: toPercent(result.virality_class_confidence),
      details: [
        `Confiance classe: ${toPercent(result.virality_class_confidence)}%`,
        `Classes: ${Object.entries(result.class_scores)
          .map(([label, value]) => `${label} ${toPercent(value)}%`)
          .join(" | ")}`,
        `Transformer: ${result.transformer.status}`,
        `Features: ${result.input.feature_columns.length}`,
      ],
    };
  }

  if ("model" in result && result.model === "biometric_heartbeat_detection") {
    return {
      label: result.label,
      score: toPercent(result.confidence),
      details: [
        `Score stress: ${result.stress_score.toFixed(2)}`,
        `Sequence: ${result.sequence.label} (${toPercent(result.sequence.confidence)}%)`,
        `Features: ${result.input.base_feature_count} HRV + ${result.input.auxiliary_feature_count} auxiliaires`,
        `Signal: ${result.sequence.input_length} points`,
      ],
    };
  }

  if ("document" in result) {
    const confidences = result.document.elements.flatMap((element) =>
      Object.values(element.predictions).map((prediction) => prediction.confidence),
    );
    const average =
      confidences.length > 0
        ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
        : 0;
    return {
      label: "Analyse terminee",
      score: toPercent(average),
      details: [
        `Cas: ${result.case_id}`,
        `Pages: ${result.document.pages.length}`,
        `Elements: ${result.document.elements.length}`,
        `Sources: ${result.retrieved.length}`,
      ],
      answer: result.answer,
    };
  }

  return {
    label: "Analyse terminee",
    score: 0,
    details: [],
  };
}

function isPropagationResult(result: ModelAnalysisResult): result is PropagationResult {
  return "model" in result && result.model === "propagation_prediction";
}

function isHeartbeatResult(result: ModelAnalysisResult): result is HeartbeatResult {
  return "model" in result && result.model === "biometric_heartbeat_detection";
}

function isMediaSafetyResult(result: ModelAnalysisResult): result is MediaSafetyResult {
  return "model" in result && result.model === "media_safety_scan";
}

function requiresFile(input: Analysis["type"]) {
  return (
    input === "image" ||
    input === "audio" ||
    input === "document" ||
    input === "video" ||
    input === "media"
  );
}

function toPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function fileKind(file: File | null): "image" | "video" | "audio" | "unknown" {
  if (!file) return "unknown";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  const name = file.name.toLowerCase();
  if (/\.(jpg|jpeg|png|webp|bmp)$/.test(name)) return "image";
  if (/\.(mp4|mov|avi|mkv|webm|m4v)$/.test(name)) return "video";
  if (/\.(wav|mp3|m4a|flac|ogg|aac)$/.test(name)) return "audio";
  return "unknown";
}

function mediaSafetyAvailability(file: File | null): MediaSafetyOptions {
  const kind = fileKind(file);
  return {
    violence: kind === "image" || kind === "video",
    threat: kind === "image" || kind === "video",
    weapons: kind === "image" || kind === "video",
    faces: kind === "image" || kind === "video",
    audio: kind === "audio" || kind === "video",
  };
}

function defaultChecksForFile(file: File | null): MediaSafetyOptions {
  return mediaSafetyAvailability(file);
}

function mediaSafetySummaryCards(result: MediaSafetyResult) {
  const cards: { key: MediaSafetyCheck; title: string; score: string; detail: string }[] = [];
  if (result.results.violence) {
    cards.push({
      key: "violence",
      title: "Violence",
      score: `${toPercent(result.results.violence.confidence)}%`,
      detail: result.results.violence.violence_detected
        ? "Violence detectee dans le media."
        : "Aucune violence detectee par ce controle.",
    });
  }
  if (result.results.threat) {
    cards.push({
      key: "threat",
      title: "Menace",
      score: `${toPercent(result.results.threat.confidence)}%`,
      detail: result.results.threat.threat_detected
        ? "Menace detectee dans le media."
        : "Aucune menace detectee par ce controle.",
    });
  }
  if (result.results.weapons) {
    cards.push({
      key: "weapons",
      title: "Armes",
      score: `${objectDetectionCount(result.results.weapons)}`,
      detail: "Detection par boites sur image ou frames video.",
    });
  }
  if (result.results.faces) {
    cards.push({
      key: "faces",
      title: "Visages",
      score: `${objectDetectionCount(result.results.faces)}`,
      detail: "Visages encadres dans le media.",
    });
  }
  if (result.results.audio) {
    const audioScore = result.results.audio.summary.top_event_probability;
    cards.push({
      key: "audio",
      title: "Audio",
      score: audioScore >= audioDisplayThreshold ? `${toPercent(audioScore)}%` : "<60%",
      detail:
        audioScore >= audioDisplayThreshold
          ? `${result.results.audio.summary.top_event} sur ${result.results.audio.summary.segments_processed} segment(s).`
          : "Aucun signal audio fort au-dessus de 60%.",
    });
  }
  return cards;
}

function objectDetectionCount(
  result: WeaponResult | FaceResult | VideoObjectDetectionResult | undefined,
) {
  if (!result) return 0;
  if ("total_detections" in result) return result.total_detections;
  return result.detections.length;
}

function objectDetectionRows(result: WeaponResult | FaceResult | VideoObjectDetectionResult) {
  if ("frame_detections" in result) {
    return result.frame_detections.flatMap((frame) =>
      frame.detections.map(
        (detection) =>
          `${formatTime(frame.time_seconds)} - ${detection.label} ${toPercent(detection.confidence)}% [${detection.box_xyxy.join(", ")}]`,
      ),
    );
  }
  return result.detections.map(
    (detection) =>
      `${detection.label} ${toPercent(detection.confidence)}% [${detection.box_xyxy.join(", ")}]`,
  );
}

function formatTimelineRange(start: number | null | undefined, end: number | null | undefined) {
  if (typeof end !== "number" || end === start) return formatTime(start);
  return `${formatTime(start)} - ${formatTime(end)}`;
}

function formatTime(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "n/a";
  return `${value.toFixed(2)}s`;
}
