"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ImageIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { checkUsername, createStore, setOnboardingAvatar, type UsernameCheck } from "@/app/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { normalizeUsername, usernameError } from "@/lib/reserved";
import { uploadFile } from "@/lib/uploads-client";
import { cn } from "@/lib/utils";
import { ga } from "@/lib/ga";

export function OnboardingForm({ suggestedUsername, suggestedName }: { suggestedUsername: string; suggestedName: string }) {
  const router = useRouter();
  const [username, setUsername] = useState(suggestedUsername);
  const [remote, setRemote] = useState<UsernameCheck | null>(null);
  const [displayName, setDisplayName] = useState(suggestedName);
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const seq = useRef(0);

  const normalized = normalizeUsername(username);
  const localError = normalized.length ? usernameError(normalized) : null;

  // Debounced live availability check; local rules are checked synchronously above.
  useEffect(() => {
    if (localError || !normalized) return;
    const id = ++seq.current;
    const t = setTimeout(() => {
      checkUsername(normalized).then((res) => {
        if (seq.current === id) setRemote(res);
      });
    }, 350);
    return () => clearTimeout(t);
  }, [normalized, localError]);

  const remoteFresh = remote?.username === normalized;
  const checking = !localError && normalized.length > 0 && !remoteFresh;
  const available = !localError && remoteFresh && remote.available;
  const checkError = localError ?? (remoteFresh ? remote.error : null);

  function pickAvatar(file: File | null) {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatar(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    startTransition(async () => {
      const res = await createStore({ username: normalized, displayName, bio });
      if (!res.ok) {
        setErrors(res.errors);
        return;
      }
      if (avatar) {
        try {
          const { key } = await uploadFile(avatar, { bucket: "public", scope: "avatar" });
          await setOnboardingAvatar(key);
        } catch (e) {
          toast.error(`Store created, but the photo did not upload: ${(e as Error).message}`);
        }
      }
      ga("sign_up", { method: "auth0" });
      ga("store_created", { username: normalized, has_avatar: Boolean(avatar), has_bio: Boolean(bio) });
      toast.success("Your store is live.");
      router.replace("/app");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-xl border bg-background p-5 sm:p-6">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">visitmy.shop/</span>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="pl-[6.6rem] pr-9"
            aria-invalid={Boolean(checkError) || Boolean(errors.username)}
            required
          />
          <span className="absolute inset-y-0 right-3 flex items-center">
            {checking ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : available ? (
              <Check className="size-4 text-emerald-600" />
            ) : checkError ? (
              <X className="size-4 text-destructive" />
            ) : null}
          </span>
        </div>
        <p className={cn("text-xs", checkError || errors.username ? "text-destructive" : "text-muted-foreground")}>
          {errors.username ?? checkError ?? (available ? `visitmy.shop/${normalized} is yours.` : "Letters, numbers, dots and underscores.")}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} required aria-invalid={Boolean(errors.displayName)} />
        {errors.displayName && <p className="text-xs text-destructive">{errors.displayName}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={3} placeholder="One or two lines about what you make." />
        <p className="text-xs text-muted-foreground">{bio.length}/300</p>
        {errors.bio && <p className="text-xs text-destructive">{errors.bio}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="avatar">Profile photo</Label>
        <div className="flex items-center gap-4">
          <label
            htmlFor="avatar"
            className="flex size-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed bg-muted/40 text-muted-foreground hover:bg-muted"
          >
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="" className="size-full object-cover" />
            ) : (
              <ImageIcon className="size-5" />
            )}
          </label>
          <div className="space-y-1">
            <input
              id="avatar"
              type="file"
              accept="image/*"
              className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:bg-background file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-foreground"
              onChange={(e) => pickAvatar(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">Square works best. Optional.</p>
          </div>
        </div>
      </div>

      {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}

      <Button type="submit" className="w-full" disabled={pending || checking || !available || !displayName.trim()}>
        {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
        Create my store
      </Button>
    </form>
  );
}
