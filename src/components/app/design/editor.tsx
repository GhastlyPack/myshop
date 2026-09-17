"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ga } from "@/lib/ga";
import { Button } from "@/components/ui/button";
import { resolveTheme, THEME_PRESETS, type ResolvedTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { resolvePublicUrl, saveTheme } from "@/app/app/design/actions";
import { BackgroundControls } from "./background";
import { BrandingControls } from "./branding";
import { ColorControls } from "./colors";
import { encodeTheme } from "./encode";
import { LayoutPicker } from "./layout-picker";
import { PresetPicker } from "./presets";
import { Preview, type PreviewMode } from "./preview";
import { Section } from "./section";
import { ShapeControls } from "./shapes";
import { TypographyControls } from "./typography";

const PREVIEW_DEBOUNCE_MS = 250;

export function DesignEditor({
  username,
  storeUrl,
  initialTheme,
  initialBgImageUrl,
}: {
  username: string;
  storeUrl: string;
  initialTheme: ResolvedTheme;
  initialBgImageUrl: string | null;
}) {
  const [theme, setTheme] = useState<ResolvedTheme>(initialTheme);
  const [saved, setSaved] = useState<ResolvedTheme>(initialTheme);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(initialBgImageUrl);
  const [savedBgImageUrl, setSavedBgImageUrl] = useState<string | null>(initialBgImageUrl);
  const [previewTheme, setPreviewTheme] = useState<ResolvedTheme>(initialTheme);
  const [mode, setMode] = useState<PreviewMode>("phone");
  const [saving, startSaving] = useTransition();

  // Debounce edits into the preview URL so slider drags do not reload the iframe on every tick.
  useEffect(() => {
    const t = setTimeout(() => setPreviewTheme(theme), PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [theme]);

  const previewSrc = useMemo(() => `/${username}?previewTheme=${encodeTheme(previewTheme)}`, [username, previewTheme]);
  const dirty = useMemo(() => JSON.stringify(theme) !== JSON.stringify(saved), [theme, saved]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (patch: Partial<ResolvedTheme>) => setTheme((t) => ({ ...t, ...patch }));

  function applyPreset(key: string) {
    const preset = THEME_PRESETS[key];
    if (!preset) return;
    // A preset is a look, not the creator's content: keep their image and branding choice.
    setTheme((t) =>
      resolveTheme({
        ...preset.theme,
        preset: key,
        bgImageKey: t.bgImageKey,
        bgOverlay: t.bgImageKey ? t.bgOverlay : (preset.theme.bgOverlay ?? 0),
        showBranding: t.showBranding,
      }),
    );
  }

  function resetToSaved() {
    setTheme(saved);
    setBgImageUrl(savedBgImageUrl);
  }

  function save() {
    startSaving(async () => {
      const res = await saveTheme(theme);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setTheme(res.theme);
      setSaved(res.theme);
      setSavedBgImageUrl(bgImageUrl);
      ga("design_saved", { preset: theme.preset ?? "custom", layout: theme.layout, heading_font: theme.headingFont });
      toast.success("Design saved. Your store is updated.");
    });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Design</h1>
        <p className="text-sm text-muted-foreground">Make your store look like you. Changes show in the preview as you go and go live when you save.</p>
      </header>

      <div className={cn("grid gap-8 lg:items-start", mode === "phone" ? "lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]" : "lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]")}>
        <div className="min-w-0">
          <div className="divide-y">
            <Section title="Presets" description="Start from a look, then tune anything below.">
              <PresetPicker value={theme.preset} onChange={applyPreset} />
            </Section>

            <Section title="Fonts">
              <TypographyControls headingFont={theme.headingFont} bodyFont={theme.bodyFont} onChange={update} />
            </Section>

            <Section title="Layout" description="How your products are arranged.">
              <LayoutPicker value={theme.layout} onChange={(layout) => update({ layout })} />
            </Section>

            <Section title="Colors">
              <ColorControls colors={theme.colors} onChange={(patch) => setTheme((t) => ({ ...t, colors: { ...t.colors, ...patch } }))} />
            </Section>

            <Section title="Shapes">
              <ShapeControls theme={theme} onChange={update} />
            </Section>

            <Section title="Background">
              <BackgroundControls
                gradient={theme.bgGradient}
                overlay={theme.bgOverlay}
                imageKey={theme.bgImageKey}
                imageUrl={bgImageUrl}
                onGradient={(bgGradient) => update({ bgGradient })}
                onOverlay={(bgOverlay) => update({ bgOverlay })}
                onImage={(key, url) => {
                  update({ bgImageKey: key });
                  setBgImageUrl(url);
                }}
                resolveUrl={resolvePublicUrl}
              />
            </Section>

            <Section title="Branding">
              <BrandingControls showBranding={theme.showBranding} onChange={(showBranding) => update({ showBranding })} />
            </Section>
          </div>

          <div className="sticky bottom-0 z-20 -mx-4 mt-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={save} disabled={saving || !dirty}>
                {saving && <Loader2 data-icon="inline-start" className="animate-spin" />}
                {saving ? "Saving" : "Save"}
              </Button>
              <Button type="button" variant="outline" onClick={resetToSaved} disabled={saving || !dirty}>
                Reset to saved
              </Button>
              <Button type="button" variant="ghost" onClick={() => applyPreset(theme.preset ?? "clean")} disabled={saving}>
                Reset to preset
              </Button>
              <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">
                {dirty ? "Unsaved changes" : "All changes saved"}
              </span>
            </div>
          </div>
        </div>

        <div className="min-w-0 lg:sticky lg:top-6">
          <Preview storeUrl={storeUrl} previewSrc={previewSrc} mode={mode} onModeChange={setMode} />
        </div>
      </div>
    </div>
  );
}
