import { useState, useRef } from "react";
import { Camera, Upload, Check, RefreshCw, X } from "lucide-react";
import { Dialog } from "../ui/Dialog.jsx";
import { Button } from "../ui/Button.jsx";
import { Avatar } from "../ui/Avatar.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useToast } from "../../hooks/useToast.js";

const DEFAULT_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80",
  "https://avatars.githubusercontent.com/u/10000001?v=4",
  "https://avatars.githubusercontent.com/u/10240111?v=4"
];

export function AvatarEditModal({ onClose }) {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [displayName, setDisplayName] = useState(user?.displayName || user?.name || "");
  const [customUrl, setCustomUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, SVG, WebP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image size should be less than 2MB.");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setAvatarUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      await updateProfile({
        avatarUrl,
        displayName: displayName.trim() || undefined,
      });
      toast.push({
        title: "Profile updated",
        body: "Your profile avatar and name have been saved successfully.",
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save profile changes.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      title="Edit profile & avatar"
      description="Update your admin display name or choose a photo."
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        {error && (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm font-medium text-danger">
            {error}
          </div>
        )}

        {/* Current Preview */}
        <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-border bg-canvas/60 p-4">
          <div className="relative group">
            <Avatar
              src={avatarUrl}
              name={displayName || user?.name}
              className="size-20 rounded-full border-2 border-primary object-cover text-base font-bold shadow-md"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload image"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/50 text-white opacity-0 transition group-hover:opacity-100"
            >
              <Camera className="size-6" />
            </button>
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h4 className="text-base font-bold text-ink truncate">{displayName || "Course Admin"}</h4>
            <p className="text-xs text-muted mt-0.5">Role: {user?.role === "admin" ? "Course Admin" : "Student"}</p>
            <div className="mt-2.5 flex flex-wrap gap-2 justify-center sm:justify-start">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                type="button"
                tone="secondary"
                className="!min-h-9 !py-1.5 !px-3 !text-xs"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-3.5" /> Upload from computer
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  tone="secondary"
                  className="!min-h-9 !py-1.5 !px-3 !text-xs text-danger hover:border-danger/40"
                  onClick={() => setAvatarUrl("")}
                >
                  <X className="size-3.5" /> Remove photo
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Name input */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-display-name" className="text-xs font-semibold uppercase tracking-wider text-muted">
            Display name
          </label>
          <input
            id="edit-display-name"
            type="text"
            className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Professor Admin"
          />
        </div>

        {/* Preset Avatars */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">
            Or choose a preset avatar
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
            {DEFAULT_AVATARS.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setAvatarUrl(url)}
                className={`relative rounded-full aspect-square overflow-hidden border-2 transition ${
                  avatarUrl === url ? "border-primary scale-105 shadow-md" : "border-border hover:border-primary/50"
                }`}
              >
                <img src={url} alt={`Preset ${i + 1}`} className="w-full h-full object-cover" />
                {avatarUrl === url && (
                  <span className="absolute inset-0 bg-primary/30 flex items-center justify-center text-white">
                    <Check className="size-4 stroke-[3]" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Direct URL input */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-avatar-url" className="text-xs font-semibold uppercase tracking-wider text-muted">
            Or paste image URL
          </label>
          <div className="flex gap-2">
            <input
              id="edit-avatar-url"
              type="url"
              className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
            <Button
              type="button"
              tone="secondary"
              className="!min-h-9 !py-1.5 !px-3 text-xs"
              onClick={() => {
                if (customUrl.trim()) {
                  setAvatarUrl(customUrl.trim());
                  setCustomUrl("");
                }
              }}
            >
              Apply URL
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-border">
          <Button tone="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button tone="primary" onClick={handleSave} loading={busy}>
            Save changes
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
