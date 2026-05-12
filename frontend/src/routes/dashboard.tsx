import { createFileRoute, Link } from "@tanstack/react-router";
import { aiModels } from "@/lib/ai-models";
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
} from "lucide-react";
import { z } from "zod";
import {
  runBackendAnalysis,
  type AudioAnalysisOptions,
  type FaceResult,
  type ModelAnalysisResult,
  type PropagationResult,
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
  type: "image" | "audio" | "document" | "video" | "text" | "structured";
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

const weaponBoxStyles: { border: string; label: string }[] = [
  { border: "border-red-500", label: "bg-red-500" },
  { border: "border-amber-500", label: "bg-amber-500" },
  { border: "border-sky-500", label: "bg-sky-500" },
  { border: "border-emerald-500", label: "bg-emerald-500" },
];

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

function DashboardPage() {
  const { model } = Route.useSearch();
  const [selected] = useState(model ?? aiModels[0].slug);
  const current = useMemo(
    () => aiModels.find((m) => m.slug === selected) ?? aiModels[0],
    [selected],
  );
  const [file, setFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [question, setQuestion] = useState("");
  const [textInput, setTextInput] = useState("");
  const [propagationFeatures, setPropagationFeatures] = useState<Record<string, number>>(
    propagationDefaultFeatures,
  );
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

  function setAudioBooleanOption(key: AudioBooleanOption, value: boolean) {
    setAudioOptions((options) => ({ ...options, [key]: value }));
  }

  useEffect(() => {
    if (!file || current.input !== "image") {
      setImagePreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
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
              ? "Signaux de propagation"
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
    current.input === "image"
      ? "Importer une image"
      : current.input === "audio"
        ? "Importer un audio"
        : current.input === "video"
          ? "Importer une video"
          : current.input === "text"
            ? "Coller un texte"
            : current.input === "structured"
              ? "Renseigner les signaux"
              : "Importer un document";

  const inputDescription =
    current.input === "image"
      ? "Formats acceptes: JPG, PNG, WEBP."
      : current.input === "audio"
        ? "Formats acceptes: MP3, WAV, M4A."
        : current.input === "video"
          ? "Formats acceptes: MP4, MOV, WEBM."
          : current.input === "text"
            ? "Texte brut analyse directement par le modele."
            : current.input === "structured"
              ? "Valeurs numeriques envoyees au modele de propagation."
              : "Formats acceptes: PDF, images, documents.";

  const InputIcon =
    current.input === "audio"
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
    (current.input === "text" && !textInput.trim());

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

            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-dashed border-border p-4 motion-card">
                <p className="flex items-center gap-2 text-base font-semibold">
                  <InputIcon className="size-4 text-primary" aria-hidden />
                  {inputTitle}
                </p>
                <p className="mt-1 text-base text-muted-foreground">{inputDescription}</p>
                {requiresFile(current.input) && (
                  <>
                    <label
                      htmlFor="file-input"
                      className="mt-3 grid place-items-center gap-2 h-32 rounded-xl border border-dashed border-border bg-muted/40 cursor-pointer hover:bg-muted transition-colors text-lg text-muted-foreground motion-button"
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
                        setFile(event.target.files?.[0] ?? null);
                        setLatest(null);
                        setError(null);
                      }}
                    />
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
                {current.input === "structured" && (
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
                {current.input === "audio" && (
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
                <span className="size-2 rounded-full bg-primary animate-pulse" /> Analyse en
                cours...
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
                {isBoxDetectionResult(latest.raw) && imagePreviewUrl && (
                  <BoxDetectionPreview result={latest.raw} imageUrl={imagePreviewUrl} />
                )}
                {isPropagationResult(latest.raw) && (
                  <PropagationCurvePreview result={latest.raw} />
                )}
                {latest.details.length > 0 && (
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

function BoxDetectionPreview({
  result,
  imageUrl,
}: {
  result: WeaponResult | FaceResult;
  imageUrl: string;
}) {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const hasImageSize = imageSize.width > 0 && imageSize.height > 0;
  const isFace = result.model === "face_detection";

  return (
    <div className="rounded-2xl bg-muted/40 p-4 motion-in">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {isFace ? "Visages encadres" : "Image annotee"}
        </p>
        <span className="text-sm text-muted-foreground">
          {result.detections.length} detection(s)
        </span>
      </div>
      <div className="relative mt-3 overflow-hidden rounded-2xl border border-border bg-background">
        <img
          src={imageUrl}
          alt="Image analysee avec detections"
          className="block h-auto w-full"
          onLoad={(event) => {
            setImageSize({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            });
          }}
        />
        {hasImageSize &&
          result.detections.map((detection, index) => {
            const [x1, y1, x2, y2] = detection.box_xyxy;
            const left = clampPercent((x1 / imageSize.width) * 100);
            const top = clampPercent((y1 / imageSize.height) * 100);
            const right = clampPercent((x2 / imageSize.width) * 100);
            const bottom = clampPercent((y2 / imageSize.height) * 100);
            const width = Math.max(0, right - left);
            const height = Math.max(0, bottom - top);
            const style = weaponBoxStyles[index % weaponBoxStyles.length];

            return (
              <div
                key={`${detection.label}-${index}-${detection.box_xyxy.join("-")}`}
                className={`absolute border-2 transition-all duration-300 ${style.border}`}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                }}
              >
                <span
                  className={`absolute left-0 top-0 max-w-full truncate px-2 py-1 text-xs font-semibold text-white ${style.label}`}
                >
                  {detection.label} {toPercent(detection.confidence)}%
                </span>
              </div>
            );
          })}
      </div>
      {result.detections.length > 0 ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {result.detections.map((detection, index) => (
            <li
              key={`${detection.label}-${index}`}
              className="rounded-xl border border-border bg-background p-3 text-sm motion-card"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{detection.label}</span>
                <span className="text-primary">{toPercent(detection.confidence)}%</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                Boite: {detection.box_xyxy.map((value) => Math.round(value)).join(", ")}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {isFace
            ? "Aucun visage a encadrer pour cette image."
            : "Aucune boite a afficher pour cette image."}
        </p>
      )}
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

function summarizeResult(result: ModelAnalysisResult) {
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

  if ("detections" in result) {
    const isFace = result.model === "face_detection";
    const top = result.detections.reduce(
      (best, item) => (item.confidence > best.confidence ? item : best),
      { label: "", confidence: 0, box_xyxy: [0, 0, 0, 0] as [number, number, number, number] },
    );
    return {
      label:
        result.detections.length > 0
          ? `${result.detections.length} detection(s)`
          : isFace
            ? "Aucun visage detecte"
            : "Aucune arme detectee",
      score: toPercent(top.confidence),
      details:
        result.detections.length > 0
          ? result.detections.map(
              (item) =>
                `${item.label}: ${toPercent(item.confidence)}% [${item.box_xyxy.join(", ")}]`,
            )
          : ["Aucune boite de detection retournee."],
    };
  }

  if ("summary" in result) {
    const transcripts = result.timeline
      .map((segment) => segment.transcript?.trim())
      .filter((text): text is string => Boolean(text))
      .slice(0, 2);
    return {
      label: result.summary.top_event,
      score: toPercent(result.summary.top_event_probability),
      details: [
        `Duree: ${result.duration_seconds}s`,
        `Segments: ${result.summary.segments_processed}`,
        `Transcription: ${result.summary.transcription_status}`,
        `Diarisation: ${result.summary.diarization_status}`,
        `Emotion HF: ${result.summary.hf_emotion_status}`,
        `Deepfake HF: ${result.summary.hf_deepfake_status}`,
        `References: ${result.summary.reference_matching_status}`,
        `Integrite: ${result.integrity.status}`,
        `XAI: ${result.xai_references.length}`,
        ...transcripts.map((text) => `Texte: ${text}`),
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
    label: result.threat_detected ? "Menace detectee" : "Aucune menace detectee",
    score: toPercent(result.confidence),
    details: [
      `Score menace: ${toPercent(result.scores.threat)}%`,
      `Score sans menace: ${toPercent(result.scores.no_threat)}%`,
      `Images analysees: ${result.video.sampled_frames}`,
      `Duree: ${result.video.duration_seconds ?? "n/a"}s`,
    ],
  };
}

function isBoxDetectionResult(result: ModelAnalysisResult): result is WeaponResult | FaceResult {
  return "detections" in result;
}

function isPropagationResult(result: ModelAnalysisResult): result is PropagationResult {
  return "model" in result && result.model === "propagation_prediction";
}

function requiresFile(input: Analysis["type"]) {
  return input === "image" || input === "audio" || input === "document" || input === "video";
}

function toPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}
