import { createFileRoute } from "@tanstack/react-router";
import Hls from "hls.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Surveillance en direct — AURA" },
      {
        name: "description",
        content: "Lancez votre camera et regardez le direct en un instant.",
      },
    ],
  }),
  component: LivePage,
});

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

type StartResponse = { stream_id: string; playlist_url: string };

function normalizeRtspUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return { error: "Entrez le lien de votre camera.", value: "" };
  const withScheme = trimmed.toLowerCase().startsWith("rtsp://") ? trimmed : `rtsp://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "rtsp:") {
      return { error: "Le lien doit commencer par rtsp://.", value: "" };
    }
  } catch {
    return { error: "Lien invalide.", value: "" };
  }
  return { error: "", value: withScheme };
}

async function stopStream(streamId: string) {
  if (!streamId) return;
  try {
    await fetch(`${API_BASE_URL}/live/stop/${streamId}`, { method: "POST" });
  } catch {
    // Ignore stop errors.
  }
}

function LivePage() {
  const [inputUrl, setInputUrl] = useState("rtsp://192.168.43.1:8080/h264_pcm.sdp");
  const [selectedTool, setSelectedTool] = useState("none");
  const [streamId, setStreamId] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const streamKey = useMemo(() => `${playlistUrl}-${streamId}`, [playlistUrl, streamId]);

  useEffect(() => {
    return () => {
      if (streamId) {
        void stopStream(streamId);
      }
    };
  }, [streamId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playlistUrl) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: true, backBufferLength: 0 });
      hls.loadSource(playlistUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => undefined);
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = playlistUrl;
      video.play().catch(() => undefined);
    } else {
      setError("Votre navigateur ne supporte pas HLS.");
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [playlistUrl]);

  const handleConnect = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const result = normalizeRtspUrl(inputUrl);
    if (result.error) {
      setError(result.error);
      return;
    }

    setError("");
    setConnecting(true);

    if (streamId) {
      await stopStream(streamId);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/live/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rtsp_url: result.value, tool: selectedTool }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = payload?.detail ?? "Oups, impossible de lancer le direct.";
        throw new Error(message);
      }

      const payload = (await response.json()) as StartResponse;
      setStreamId(payload.stream_id);
      setPlaylistUrl(`${API_BASE_URL}/live/stream/${payload.stream_id}/index.m3u8`);
    } catch (err) {
      setStreamId("");
      setPlaylistUrl("");
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-primary">Outil en temps reel</p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-display text-balance">
          Lancez l'outil sur votre camera, en temps reel.
        </h1>
        <p className="mt-4 text-muted-foreground text-lg">
          Choisissez l'outil, puis ajoutez le lien RTSP de la camera pour demarrer.
        </p>
      </header>

      <form onSubmit={handleConnect} className="grid gap-4 max-w-2xl">
        <div className="grid gap-4 sm:grid-cols-[2fr,1fr] items-start">
          <div className="space-y-2">
            <label htmlFor="live-url" className="text-sm font-medium text-foreground">
              Lien RTSP de la camera
            </label>
            <Input
              id="live-url"
              value={inputUrl}
              onChange={(event) => {
                setInputUrl(event.target.value);
                if (error) setError("");
              }}
              placeholder="rtsp://192.168.43.1:8080/h264_pcm.sdp"
              inputMode="url"
              autoComplete="url"
            />
            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label htmlFor="live-tool" className="text-sm font-medium text-foreground">
              Outil 
            </label>
            <select
              id="live-tool"
              value={selectedTool}
              onChange={(event) => setSelectedTool(event.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
            >
              <option value="none">Aucun</option>
              <option value="weapon_detection">Detection d'arme (disponible)</option>
              <option value="face_detection" disabled>
                Detection de visage (bientot)
              </option>
              <option value="threat_detection" disabled>
                Detection de menace (bientot)
              </option>
            </select>
            
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={connecting}>
            {connecting ? "Connexion..." : "Lancer l'outil"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setInputUrl("");
              if (streamId) {
                void stopStream(streamId);
              }
              setStreamId("");
              setPlaylistUrl("");
              setError("");
            }}
          >
            Reinitialiser
          </Button>
          {playlistUrl ? <Badge variant="secondary">Outil actif</Badge> : null}
        </div>
      </form>

      <div className="rounded-3xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Apercu de l'outil</p>
            <p className="text-xs text-muted-foreground">
              {playlistUrl ? inputUrl : "Aucun flux connecte"}
            </p>
          </div>
        </div>
        <div className="relative aspect-video bg-muted/50">
          {playlistUrl ? (
            <video
              key={streamKey}
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              controls
              muted
              playsInline
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
              Ajoutez un lien RTSP pour demarrer l'outil.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
