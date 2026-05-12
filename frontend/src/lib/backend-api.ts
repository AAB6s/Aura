import type { AIModel } from "@/lib/ai-models";

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

export type AudioAnalysisOptions = {
  transcription: boolean;
  whisperModel: "tiny" | "base" | "small";
  speakerGrouping: boolean;
  pyannoteDiarization: boolean;
  hfEmotion: boolean;
  hfDeepfake: boolean;
  acousticContext: boolean;
  integrity: boolean;
  xai: boolean;
};

export type SexismResult = {
  file: string;
  model: "sexism_detection";
  label: "not_sexist" | "sexist";
  sexism_detected: boolean;
  confidence: number;
  scores: {
    not_sexist: number;
    sexist: number;
  };
  original_size: [number, number];
  input_size: [640, 640];
};

export type WeaponResult = {
  file: string;
  model: "weapon_detection";
  detections: {
    label: string;
    confidence: number;
    box_xyxy: [number, number, number, number];
  }[];
};

export type FaceResult = {
  file: string;
  model: "face_detection";
  detections: {
    label: string;
    confidence: number;
    box_xyxy: [number, number, number, number];
  }[];
  original_size: [number, number];
};

export type ImageAuthenticityResult = {
  file: string;
  model: "image_authenticity_detection";
  label: "REAL" | "AI_GENERATED_OR_FAKE";
  ai_generated: boolean;
  confidence: number;
  threshold: number;
  scores: {
    REAL: number;
    AI_GENERATED_OR_FAKE: number;
  };
  original_size: [number, number];
  input_size: [224, 224];
};

export type TextAuthenticityResult = {
  model: "text_authenticity_detection";
  label: "HUMAN" | "AI_GENERATED";
  ai_generated: boolean;
  confidence: number;
  threshold: number;
  scores: {
    HUMAN: number;
    AI_GENERATED: number;
  };
  input: {
    characters: number;
    max_length: number;
  };
};

export type PropagationResult = {
  model: "propagation_prediction";
  virality_score: number;
  virality_class: string;
  virality_class_confidence: number;
  class_scores: Record<string, number>;
  transformer: {
    status: "ready" | "unavailable";
    error: string | null;
    propagation_curve: number[];
  };
  input: {
    features: Record<string, number>;
    feature_columns: string[];
    sequence_length: number;
  };
  metrics: Record<string, number>;
};

export type AudioResult = {
  file: string;
  file_hash: string;
  duration_seconds: number;
  sample_rate: number;
  model: {
    name: string;
    classes: string[];
    path: string;
    temperature: number;
    tta_shifts: number[];
    metrics: Record<string, unknown>;
  };
  summary: {
    top_event: string;
    top_event_probability: number;
    event_counts: Record<string, number>;
    mean_confidence_by_class: Record<string, number>;
    segments_processed: number;
    speaker_groups: number;
    transcription_status: string;
    diarization_status: string;
    hf_emotion_status: string;
    hf_deepfake_status: string;
    reference_matching_status: string;
  };
  integrity: {
    status: string;
    issues?: string[];
    snr_db?: number;
    peak?: number;
    rms?: number;
    clipping_ratio?: number;
  };
  timeline: {
    index: number;
    start: number;
    end: number;
    event_label: string;
    event_confidence: number;
    decision_status: string;
    secondary_events: { label: string; probability: number }[];
    probabilities: { label: string; probability: number }[];
    features: Record<string, number>;
    low_energy: boolean;
    acoustic_context?: string;
    speaker?: string;
    transcript?: string;
    transcript_status?: string;
    language?: string;
    hf_emotion?: {
      status: string;
      model?: string;
      predictions?: { label: string; score: number }[];
      reason?: string;
    };
    hf_deepfake?: {
      status: string;
      model?: string;
      predictions?: { label: string; score: number }[];
      reason?: string;
    };
    reference_speaker?: {
      label: string;
      distance: number;
      status: string;
    };
  }[];
  xai_references: {
    class: string;
    artifact: string;
    relative_path: string;
  }[];
  elapsed_seconds: number;
};

type DocumentPrediction = {
  label: string;
  confidence: number;
  runner_up: string | null;
  scores: Record<string, number>;
  unclassifiable?: boolean;
  risk_label?: string;
};

type RetrievedChunk = {
  chunk_id: string;
  text: string;
  source_file?: string;
  page?: number | string;
  element_id?: string;
  kind: string;
  region_type?: string;
  bbox?: number[];
  text_source?: string;
  layout_confidence?: number;
  reading_order?: number;
  chunk_index?: number;
  rank: number;
  score?: number;
};

export type DocumentAnalyzeResult = {
  case_id: string;
  file: string;
  question: string;
  answer: string;
  model_status: {
    name: string;
    loaded: boolean;
    path: string;
    error: string | null;
    temperature: number | null;
    classes: string[];
    tta: boolean;
    device: string;
  }[];
  document: {
    file: string;
    file_hash: string;
    model_summary: string;
    pages: {
      page: number | string;
      regions: {
        id?: string;
        region_type?: string;
        bbox?: number[];
        layout_confidence?: number;
        text_source?: string;
        reading_order?: number;
        has_text: boolean;
        has_predictions: boolean;
      }[];
    }[];
    elements: {
      id: string;
      source_file?: string;
      page?: number | string;
      kind?: string;
      region_type?: string;
      bbox?: number[];
      layout_confidence?: number;
      text_source?: string;
      reading_order?: number;
      page_width?: number;
      page_height?: number;
      text: string;
      model_context: string;
      predictions: {
        content?: DocumentPrediction;
        evidence?: DocumentPrediction;
        quality?: DocumentPrediction;
        tamper?: DocumentPrediction;
      };
    }[];
  };
  retrieved: RetrievedChunk[];
  metrics: Record<string, unknown>;
  warnings: string[];
};

export type ThreatResult = {
  file: string;
  model: "threat_detection";
  label: "no_threat" | "threat";
  threat_detected: boolean;
  confidence: number;
  threshold: number;
  scores: {
    no_threat: number;
    threat: number;
  };
  video: {
    media_type: "video" | "image";
    frame_count: number;
    fps: number | null;
    duration_seconds: number | null;
    sampled_frames: number;
  };
  input: {
    clip_frames: number;
    input_size: [112, 112];
  };
};

export type ModelAnalysisResult =
  | SexismResult
  | WeaponResult
  | FaceResult
  | ImageAuthenticityResult
  | TextAuthenticityResult
  | PropagationResult
  | AudioResult
  | DocumentAnalyzeResult
  | ThreatResult;

export async function runBackendAnalysis(
  model: AIModel,
  file: File | null,
  question: string,
  audioOptions?: AudioAnalysisOptions,
  text?: string,
  propagationFeatures?: Record<string, number>,
) {
  let endpoint = "";

  if (model.slug === "propagation_prediction") {
    const response = await fetch(`${API_BASE_URL}/propagation/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features: propagationFeatures ?? {} }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const detail =
        payload && typeof payload === "object" && "detail" in payload
          ? String(payload.detail)
          : "Request failed";
      throw new Error(detail);
    }
    return payload as ModelAnalysisResult;
  }

  const form = new FormData();

  if (model.slug === "sexism_detection") {
    if (!file) throw new Error("File is required.");
    form.append("file", file);
    endpoint = "/sexism/detect";
  } else if (model.slug === "weapon_detection") {
    if (!file) throw new Error("File is required.");
    form.append("file", file);
    endpoint = "/weapon/detect";
  } else if (model.slug === "image_authenticity_detection") {
    if (!file) throw new Error("File is required.");
    form.append("file", file);
    endpoint = "/image-authenticity/detect";
  } else if (model.slug === "face_detection") {
    if (!file) throw new Error("File is required.");
    form.append("file", file);
    endpoint = "/face/detect";
  } else if (model.slug === "text_authenticity_detection") {
    endpoint = "/text-authenticity/detect";
    form.append("text", text ?? "");
  } else if (model.slug === "audio_violence_detection") {
    if (!file) throw new Error("File is required.");
    form.append("file", file);
    endpoint = "/audio/analyze";
    if (audioOptions) {
      form.append("transcription", String(audioOptions.transcription));
      form.append("whisper_model", audioOptions.whisperModel);
      form.append("speaker_grouping", String(audioOptions.speakerGrouping));
      form.append("pyannote_diarization", String(audioOptions.pyannoteDiarization));
      form.append("hf_emotion", String(audioOptions.hfEmotion));
      form.append("hf_deepfake", String(audioOptions.hfDeepfake));
      form.append("acoustic_context", String(audioOptions.acousticContext));
      form.append("integrity", String(audioOptions.integrity));
      form.append("xai", String(audioOptions.xai));
    } else {
      form.append("transcription", "false");
    }
  } else if (model.slug === "document_intelligence_rag") {
    if (!file) throw new Error("File is required.");
    form.append("file", file);
    endpoint = "/document/analyze";
    form.append("question", question);
  } else if (model.slug === "threat_detection") {
    if (!file) throw new Error("File is required.");
    form.append("file", file);
    endpoint = "/threat/detect";
  } else {
    throw new Error(`Unsupported model: ${model.slug}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    body: form,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String(payload.detail)
        : "Request failed";
    throw new Error(detail);
  }
  return payload as ModelAnalysisResult;
}
