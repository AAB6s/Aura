import { Activity, FileText, HeartPulse, Image, ShieldCheck, Type } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AIModel = {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  input: "image" | "audio" | "document" | "video" | "text" | "structured" | "media";
  accept: string;
};

export const aiModels: AIModel[] = [
  {
    slug: "sexism_detection",
    name: "Detection de sexisme",
    description: "Analyse une image pour reperer des contenus sexistes.",
    icon: Image,
    accent: "bg-primary/15 text-primary",
    input: "image",
    accept: "image/*",
  },
  {
    slug: "media_safety_scan",
    name: "Media Safety Scan",
    description: "Analyse images, videos et audios avec les controles de securite choisis.",
    icon: ShieldCheck,
    accent: "bg-secondary text-secondary-foreground",
    input: "media",
    accept: "image/*,video/*,audio/*",
  },
  {
    slug: "image_authenticity_detection",
    name: "Authenticite image",
    description: "Detecte si une image semble reelle ou generee par IA.",
    icon: Image,
    accent: "bg-primary/15 text-primary",
    input: "image",
    accept: "image/*",
  },
  {
    slug: "text_authenticity_detection",
    name: "Authenticite texte",
    description: "Analyse un texte pour estimer s'il est humain ou genere par IA.",
    icon: Type,
    accent: "bg-secondary text-secondary-foreground",
    input: "text",
    accept: "",
  },
  {
    slug: "propagation_prediction",
    name: "Prediction de propagation",
    description: "Estime le score, la classe et la courbe de propagation.",
    icon: Activity,
    accent: "bg-primary/15 text-primary",
    input: "structured",
    accept: "",
  },
  {
    slug: "biometric_heartbeat_detection",
    name: "Analyse cardiaque biometrique",
    description: "Analyse des signaux HRV pour estimer stress et danger physiologique.",
    icon: HeartPulse,
    accent: "bg-accent text-accent-foreground",
    input: "structured",
    accept: "",
  },
  {
    slug: "document_intelligence_rag",
    name: "Analyse de documents",
    description: "Analyse un document ou une image et repond aux questions.",
    icon: FileText,
    accent: "bg-primary/15 text-primary",
    input: "document",
    accept: ".pdf,.png,.jpg,.jpeg,.webp,.docx,.txt,.json,.xlsx,image/*",
  },
];
