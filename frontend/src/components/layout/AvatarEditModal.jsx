import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Dialog } from "../ui/Dialog.jsx";
import { Button } from "../ui/Button.jsx";
import { Avatar } from "../ui/Avatar.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { useToast } from "../../hooks/useToast.js";

// Clean, high-resolution developer & professor avatars
const AVATAR_COLLECTIONS = [
  {
    category: "Pro Dev & Professor Avatars",
    items: [
      { id: "dev-1", name: "Algorithm Specialist", url: "https://api.dicebear.com/7.x/bottts/svg?seed=SolversAdmin&backgroundColor=b6e3f4,c0aede,d1d4f9" },
      { id: "dev-2", name: "Data Structures Lead", url: "https://api.dicebear.com/7.x/bottts/svg?seed=DataStructures&backgroundColor=ffd5dc,ffdfbf" },
      { id: "dev-3", name: "System Architect", url: "https://api.dicebear.com/7.x/bottts/svg?seed=SystemArch&backgroundColor=d1d4f9,c0aede" },
      { id: "dev-4", name: "Competitive Programmer", url: "https://api.dicebear.com/7.x/bottts/svg?seed=LeetMaster&backgroundColor=b6e3f4,ffd5dc" },
      { id: "dev-5", name: "Code Reviewer", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Reviewer&backgroundColor=c0aede,d1d4f9" },
      { id: "dev-6", name: "Core Maintainer", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Maintainer&backgroundColor=ffdfbf,ffd5dc" },
    ]
  },
  {
    category: "Modern 3D Minimal Characters",
    items: [
      { id: "char-1", name: "Alex - Senior Mentor", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=ProfessorRao&backgroundColor=b6e3f4" },
      { id: "char-2", name: "Sarah - DSA Coach", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=CoachSarah&backgroundColor=ffd5dc" },
      { id: "char-3", name: "David - Tech Lead", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=TechLeadDavid&backgroundColor=c0aede" },
      { id: "char-4", name: "Elena - Problem Setter", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=ElenaSetter&backgroundColor=d1d4f9" },
      { id: "char-5", name: "Marcus - Chief Evaluator", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=MarcusChief&backgroundColor=ffdfbf" },
      { id: "char-6", name: "Priya - Course Admin", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=CourseAdminPriya&backgroundColor=b6e3f4" },
    ]
  },
  {
    category: "Notion & Pixel Tech Art",
    items: [
      { id: "art-1", name: "Byte Sensei", url: "https://api.dicebear.com/7.x/pixel-art/svg?seed=ByteSensei" },
      { id: "art-2", name: "Binary Master", url: "https://api.dicebear.com/7.x/pixel-art/svg?seed=BinaryMaster" },
      { id: "art-3", name: "Stack Ninja", url: "https://api.dicebear.com/7.x/pixel-art/svg?seed=StackNinja" },
      { id: "art-4", name: "Tree Sage", url: "https://api.dicebear.com/7.x/pixel-art/svg?seed=TreeSage" },
      { id: "art-5", name: "Graph Hacker", url: "https://api.dicebear.com/7.x/pixel-art/svg?seed=GraphHacker" },
      { id: "art-6", name: "DP Wizard", url: "https://api.dicebear.com/7.x/pixel-art/svg?seed=DPWizard" },
    ]
  }
];

export function AvatarEditModal({ onClose }) {
  const { user, updateProfile } = useAuth();
  const toast = useToast();

  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [displayName, setDisplayName] = useState(user?.displayName || user?.name || "");
  const [customUrl, setCustomUrl] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

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
        body: "Your profile avatar and details were saved successfully.",
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
      title="Admin Profile & Avatar"
      description="Choose from developer & mentor preset avatars to represent your profile."
      wide
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        {error && (
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-2.5 text-xs font-medium text-danger">
            {error}
          </div>
        )}

        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-border bg-canvas/60 p-3.5 sm:p-4 shadow-xs">
          <Avatar
            src={avatarUrl}
            name={displayName || user?.name}
            className="size-16 sm:size-20 shrink-0 rounded-full border-2 border-primary bg-surface object-cover text-lg font-bold shadow-md"
          />

          <div className="min-w-0 flex-1 w-full text-center sm:text-left">
            <div>
              <h4 className="text-base font-bold text-ink truncate">{displayName || "Course Admin"}</h4>
              <p className="text-[11px] text-muted mt-0.5">Role: <strong className="text-ink">Course Admin</strong> · Access: Verified</p>
            </div>

            <div className="mt-2.5 flex flex-col gap-1">
              <label htmlFor="edit-name-inp" className="text-[11px] font-semibold uppercase tracking-wider text-muted text-left">
                Admin Display Name
              </label>
              <input
                id="edit-name-inp"
                type="text"
                className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs sm:text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Professor Admin"
              />
            </div>
          </div>
        </div>

        {/* Avatar Categories Tabs */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" /> Preset Avatars (Click to select)
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-border/80 pb-2">
            {AVATAR_COLLECTIONS.map((col, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveCategory(idx)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  activeCategory === idx
                    ? "bg-primary text-white shadow-xs"
                    : "bg-surface border border-border text-muted hover:text-ink hover:bg-canvas"
                }`}
              >
                {col.category}
              </button>
            ))}
          </div>

          {/* Grid of Avatars */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 pt-0.5">
            {AVATAR_COLLECTIONS[activeCategory].items.map((item) => {
              const isSelected = avatarUrl === item.url;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAvatarUrl(item.url)}
                  className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition text-center cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                      : "border-border/80 bg-surface hover:border-primary/50 hover:bg-canvas"
                  }`}
                >
                  <div className="size-12 rounded-full overflow-hidden border border-border/60 bg-canvas flex items-center justify-center p-0.5">
                    <img src={item.url} alt={item.name} className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[10px] font-medium text-ink/80 group-hover:text-ink truncate max-w-full">
                    {item.name}
                  </span>
                  {isSelected && (
                    <span className="absolute top-1 right-1 size-3.5 rounded-full bg-primary text-white flex items-center justify-center">
                      <Check className="size-2 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Paste Web Image URL */}
        <div className="flex flex-col gap-1 pt-2 border-t border-border/80">
          <label htmlFor="direct-url-inp" className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Or paste custom image URL
          </label>
          <div className="flex gap-2">
            <input
              id="direct-url-inp"
              type="url"
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs sm:text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/photo.png"
            />
            <Button
              type="button"
              tone="secondary"
              className="!min-h-8 !py-1 !px-2.5 text-xs"
              onClick={() => {
                if (customUrl.trim()) {
                  setAvatarUrl(customUrl.trim());
                  setCustomUrl("");
                }
              }}
            >
              Apply
            </Button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
          <Button tone="secondary" onClick={onClose} disabled={busy} className="!min-h-9 !py-1.5 !px-3 text-xs">
            Cancel
          </Button>
          <Button tone="primary" onClick={handleSave} loading={busy} className="!min-h-9 !py-1.5 !px-4 text-xs font-semibold">
            Save Changes
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
