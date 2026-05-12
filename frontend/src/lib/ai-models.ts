import { Activity, Image, Mic, FileText, ShieldAlert, Type, Video, ScanFace } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AIModel = {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  accent: string; // tailwind class for icon bg
  input: "image" | "audio" | "document" | "video" | "text" | "structured";
  accept: string;
};

export const aiModels: AIModel[] = [
  {
    slug: "sexism_detection",
    name: "Détection de sexisme (image)",
    description: "Analyse une image pour repérer des contenus sexistes.",
    icon: Image,
    accent: "bg-primary/15 text-primary",
    input: "image",
    accept: "image/*",
  },
  {
    slug: "weapon_detection",
    name: "Détection d'armes (image)",
    description: "Repère la présence d'armes sur une image.",
    icon: ShieldAlert,
    accent: "bg-secondary text-secondary-foreground",
    input: "image",
    accept: "image/*",
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
    slug: "face_detection",
    name: "Detection de visages",
    description: "Localise les visages et renvoie les boites de detection.",
    icon: ScanFace,
    accent: "bg-accent text-accent-foreground",
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
    slug: "audio_violence_detection",
    name: "Analyse audio de violence",
    description: "Analyse un fichier audio pour détecter des signes de violence.",
    icon: Mic,
    accent: "bg-accent text-accent-foreground",
    input: "audio",
    accept: "audio/*",
  },
  {
    slug: "document_intelligence_rag",
    name: "Analyse de documents",
    description: "Analyse un document ou une image et répond aux questions.",
    icon: FileText,
    accent: "bg-primary/15 text-primary",
    input: "document",
    accept: ".pdf,.png,.jpg,.jpeg,.webp,.docx,.txt,.json,.xlsx,image/*",
  },
  {
    slug: "threat_detection",
    name: "Détection de menace (vidéo)",
    description: "Analyse une vidéo pour repérer des situations menaçantes.",
    icon: Video,
    accent: "bg-secondary text-secondary-foreground",
    input: "video",
    accept: "video/*",
  },
];
