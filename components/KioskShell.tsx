"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ControlPanel } from "@/components/ControlPanel";
import { PaintingCanvas } from "@/components/PaintingCanvas";
import {
  DEFAULT_BRUSH_PARAMS,
  isBrushParams,
  normalizeBrushParams,
  type BrushParams,
} from "@/lib/brushParams";
import { usePaintingKeyboard } from "@/hooks/usePaintingKeyboard";

type SketchActions = {
  clearArt: () => void;
  getArtworkPngBase64: () => string | null;
  loadArtworkFromImageUrl: (imageUrl: string) => Promise<void>;
};

type LoadedArtwork = {
  id: string;
  title: string | null;
  imageUrl: string;
  params: BrushParams;
};

export function KioskShell() {
  const searchParams = useSearchParams();
  const artworkIdFromUrl = searchParams.get("artwork");

  const sketchRef = useRef<SketchActions | null>(null);
  const sketchReadyRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const prevArtworkIdFromUrlRef = useRef<string | null>(null);
  const [sketchVersion, setSketchVersion] = useState(0);
  const [params, setParams] = useState<BrushParams>({ ...DEFAULT_BRUSH_PARAMS });
  const [title, setTitle] = useState("");
  const [editingArtworkId, setEditingArtworkId] = useState<string | null>(null);
  const [isLoadingArtwork, setIsLoadingArtwork] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [saveMessage, setSaveMessage] = useState("");

  const saveTargetId = artworkIdFromUrl ?? editingArtworkId;

  const resetForNewPainting = useCallback(() => {
    setEditingArtworkId(null);
    setTitle("");
    setParams({ ...DEFAULT_BRUSH_PARAMS });
    setSaveStatus("idle");
    setSaveMessage("");
    sketchRef.current?.clearArt();
  }, []);

  const loadArtwork = useCallback(async (id: string) => {
    const api = sketchRef.current;
    if (!api) return;

    const requestId = ++loadRequestIdRef.current;
    setIsLoadingArtwork(true);

    try {
      const res = await fetch(`/api/artworks/${id}`);
      if (!res.ok) throw new Error("Artwork not found");

      const data = (await res.json()) as LoadedArtwork;
      if (!isBrushParams(data.params)) {
        throw new Error("Invalid artwork data");
      }

      if (requestId !== loadRequestIdRef.current) return;

      await api.loadArtworkFromImageUrl(`/api/artworks/${id}/image`);

      if (requestId !== loadRequestIdRef.current) return;

      setParams(normalizeBrushParams(data.params));
      setTitle(data.title ?? "");
      setEditingArtworkId(data.id);
      setSaveStatus("idle");
      setSaveMessage("");
    } catch (error) {
      if (requestId !== loadRequestIdRef.current) return;
      if (error instanceof Error && error.message === "Load cancelled") return;

      setEditingArtworkId(null);
      setSaveStatus("error");
      setSaveMessage("Could not load this artwork.");
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsLoadingArtwork(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!artworkIdFromUrl) {
      if (prevArtworkIdFromUrlRef.current !== null) {
        prevArtworkIdFromUrlRef.current = null;
        resetForNewPainting();
      }
      return;
    }

    prevArtworkIdFromUrlRef.current = artworkIdFromUrl;

    if (!sketchReadyRef.current || !sketchRef.current) return;

    void loadArtwork(artworkIdFromUrl);
  }, [artworkIdFromUrl, loadArtwork, resetForNewPainting, sketchVersion]);

  usePaintingKeyboard({
    params,
    onParamsChange: setParams,
  });

  const handleSave = async () => {
    if (isLoadingArtwork) {
      setSaveStatus("error");
      setSaveMessage("Still loading artwork. Try again in a moment.");
      return;
    }

    let imageBase64: string | null = null;
    try {
      imageBase64 = sketchRef.current?.getArtworkPngBase64() ?? null;
    } catch {
      imageBase64 = null;
    }

    if (!imageBase64) {
      setSaveStatus("error");
      setSaveMessage("Could not capture painting. Try again.");
      return;
    }

    setSaveStatus("saving");
    setSaveMessage("");

    const payload = {
      imageBase64,
      params,
      title: title.trim() || undefined,
    };

    try {
      const url = saveTargetId
        ? `/api/artworks/${saveTargetId}`
        : "/api/artworks";
      const method = saveTargetId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Save failed");

      const data = await res.json();
      if (!saveTargetId && data.id) {
        setEditingArtworkId(data.id);
      }

      setSaveStatus("success");
      setSaveMessage(
        saveTargetId ? "Updated in gallery." : "Saved! View in gallery."
      );
    } catch {
      setSaveStatus("error");
      setSaveMessage("Could not save. Try again.");
    }
  };

  const handleSketchReady = (api: SketchActions) => {
    sketchRef.current = api;
    sketchReadyRef.current = true;
    setSketchVersion((version) => version + 1);
  };

  return (
    <ControlPanel
      params={params}
      onParamsChange={setParams}
      onClear={() => sketchRef.current?.clearArt()}
      title={title}
      onTitleChange={setTitle}
      onSave={handleSave}
      saveStatus={saveStatus}
      saveMessage={saveMessage}
      saveLabel={saveTargetId ? "Update gallery" : "Save to gallery"}
      saveDisabled={isLoadingArtwork}
      savedArtworkId={saveTargetId}
      canvas={
        <PaintingCanvas params={params} onReady={handleSketchReady} />
      }
    />
  );
}
