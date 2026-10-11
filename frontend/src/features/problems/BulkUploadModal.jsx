import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, FileText, CheckCircle2, AlertCircle, FileUp, Sparkles, X } from "lucide-react";
import { Dialog } from "../../components/ui/Dialog.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { saveProblemsBulk } from "../../services/api.js";

const DEFAULT_TOPICS = ["Arrays", "Binary Search", "Stacks", "Sliding Window", "Linked List", "Graphs", "Dynamic Programming", "Trees"];

export function BulkUploadModal({ onClose, onDone }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("file"); // "file" or "paste"
  const [pasteText, setPasteText] = useState("");

  // Parse CSV / TSV text
  const parseDelimited = (text, delimiter = ",") => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    // Parse header
    const headers = lines[0].split(delimiter).map((h) => h.replace(/^["']|["']$/g, "").trim().toLowerCase());
    const items = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Handle quotes in CSV
      const parts = [];
      let cur = "";
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          parts.push(cur.trim());
          cur = "";
        } else {
          cur += char;
        }
      }
      parts.push(cur.trim());

      const item = {
        title: "",
        topic: "Arrays",
        difficulty: "Easy",
        statement: "",
        examples: [],
        constraints: [],
        sourceUrl: "",
        status: "PUBLISHED"
      };

      headers.forEach((h, idx) => {
        const val = parts[idx]?.replace(/^["']|["']$/g, "").trim() || "";
        if (h.includes("title") || h === "name") item.title = val;
        else if (h.includes("topic") || h.includes("category")) item.topic = val || "Arrays";
        else if (h.includes("diff")) {
          const lower = val.toLowerCase();
          item.difficulty = lower.includes("hard") ? "Hard" : lower.includes("med") ? "Medium" : "Easy";
        }
        else if (h.includes("statement") || h.includes("desc") || h.includes("problem")) item.statement = val;
        else if (h.includes("example")) item.examples = val ? val.split(";").map((s) => s.trim()).filter(Boolean) : [];
        else if (h.includes("constraint")) item.constraints = val ? val.split(";").map((s) => s.trim()).filter(Boolean) : [];
        else if (h.includes("url") || h.includes("link") || h.includes("source")) item.sourceUrl = val;
      });

      if (item.title && (item.statement || item.title.length > 5)) {
        if (!item.statement) item.statement = `Solve problem: ${item.title}. Write optimal solution with time and space complexity analysis.`;
        items.push(item);
      }
    }

    return items;
  };

  // Parse structured or raw document text (from Word, PDF, Docs text extraction)
  const parseDocumentText = (rawText) => {
    // Try JSON first
    try {
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed.problems)) return parsed.problems;
    } catch {
      // not json, continue
    }

    // Try CSV/TSV
    if (rawText.includes(",") && rawText.includes("\n")) {
      const csvResults = parseDelimited(rawText, ",");
      if (csvResults.length > 0) return csvResults;
    }
    if (rawText.includes("\t") && rawText.includes("\n")) {
      const tsvResults = parseDelimited(rawText, "\t");
      if (tsvResults.length > 0) return tsvResults;
    }

    // Parse Markdown or Text sections: e.g. "Problem 1: Title\nTopic: Arrays\nStatement: ..."
    // or separated by "---" or "Problem" or numbered "1. ", "2. "
    const chunks = rawText.split(/\n\s*---\s*\n|\n(?=(?:Problem\s*\d+|#+\s*Problem|\d+[\.)]\s+))/i);
    const items = [];

    for (const chunk of chunks) {
      const text = chunk.trim();
      if (!text || text.length < 15) continue;

      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      let title = "";
      let topic = "Arrays";
      let difficulty = "Easy";
      let statement = "";
      let examples = [];
      let constraints = [];
      let sourceUrl = "";

      let inStatement = false;
      let inExamples = false;
      let inConstraints = false;

      for (const line of lines) {
        const lower = line.toLowerCase();
        if (/^(?:#+\s*)?(?:problem(?:\s*\d+)?[:.-]?\s*)?(title[:.-]|\d+[\.)]\s+)/i.test(line) && !title) {
          title = line.replace(/^(?:#+\s*)?(?:problem(?:\s*\d+)?[:.-]?\s*)?(?:title[:.-]\s*|\d+[\.)]\s*)/i, "").trim();
        } else if (lower.startsWith("topic:") || lower.startsWith("category:")) {
          topic = line.replace(/^(?:topic|category):\s*/i, "").trim();
        } else if (lower.startsWith("difficulty:") || lower.startsWith("level:")) {
          const val = line.replace(/^(?:difficulty|level):\s*/i, "").trim().toLowerCase();
          difficulty = val.includes("hard") ? "Hard" : val.includes("med") ? "Medium" : "Easy";
        } else if (lower.startsWith("source:") || lower.startsWith("url:") || lower.startsWith("link:")) {
          sourceUrl = line.replace(/^(?:source|url|link):\s*/i, "").trim();
        } else if (lower.startsWith("statement:") || lower.startsWith("description:")) {
          inStatement = true;
          inExamples = false;
          inConstraints = false;
          statement += line.replace(/^(?:statement|description):\s*/i, "").trim() + " ";
        } else if (lower.startsWith("example") || lower.startsWith("examples:")) {
          inExamples = true;
          inStatement = false;
          inConstraints = false;
          const ex = line.replace(/^examples?[:.-]?\s*/i, "").trim();
          if (ex) examples.push(ex);
        } else if (lower.startsWith("constraint") || lower.startsWith("constraints:")) {
          inConstraints = true;
          inStatement = false;
          inExamples = false;
          const co = line.replace(/^constraints?[:.-]?\s*/i, "").trim();
          if (co) constraints.push(co);
        } else {
          if (!title) {
            title = line.replace(/^[#\d\.\-\s]+/, "").trim();
          } else if (inExamples) {
            examples.push(line);
          } else if (inConstraints) {
            constraints.push(line);
          } else {
            statement += line + " ";
          }
        }
      }

      if (title) {
        items.push({
          title,
          topic: topic || "Arrays",
          difficulty,
          statement: statement.trim() || `Solve ${title} problem with edge case verification.`,
          examples,
          constraints,
          sourceUrl,
          status: "PUBLISHED"
        });
      }
    }

    return items;
  };

  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setError(null);
    setParsing(true);

    try {
      const ext = selected.name.split(".").pop()?.toLowerCase();
      let rawText = "";

      // Plain text formats: csv, txt, json, tsv
      if (["csv", "txt", "tsv", "json", "md"].includes(ext)) {
        rawText = await selected.text();
      } else {
        // For doc, docx, xls, xlsx, pdf files:
        // Read file bytes and extract human-readable text tokens
        const buffer = await selected.arrayBuffer();
        const decoder = new TextDecoder("utf-8", { fatal: false });
        const decoded = decoder.decode(buffer);
        // Clean out binary control characters
        rawText = decoded.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "\n");
      }

      const results = parseDocumentText(rawText);
      if (results.length === 0) {
        throw new Error(
          "Could not detect problem entries in this file. Please ensure problems have titles and descriptions, or use the CSV/Text format tab."
        );
      }
      setParsedItems(results);
    } catch (err) {
      setError(err.message || "Failed to parse file.");
      setParsedItems([]);
    } finally {
      setParsing(false);
    }
  };

  const handleParsePasted = () => {
    if (!pasteText.trim()) {
      setError("Please paste problem content or CSV data first.");
      return;
    }
    setError(null);
    const results = parseDocumentText(pasteText.trim());
    if (results.length === 0) {
      setError("Could not extract problems from pasted text. Please check the format.");
      setParsedItems([]);
    } else {
      setParsedItems(results);
    }
  };

  const handleConfirmUpload = async () => {
    if (parsedItems.length === 0) return;
    setBusy(true);
    setError(null);

    try {
      const res = await saveProblemsBulk(parsedItems);
      const count = res.data?.totalCreated || parsedItems.length;
      onDone(`Successfully imported ${count} problems into the catalog.`);
    } catch (err) {
      setError(err.message || "Failed to upload problems to the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      title="Bulk upload problems"
      description="Upload multiple problem statements from Excel, CSV, Word, Docs, PDF or paste directly."
      wide
      onClose={onClose}
    >
      <div className="flex flex-col gap-5">
        {/* Tab selection */}
        <div className="flex border-b border-border gap-4">
          <button
            type="button"
            onClick={() => { setActiveTab("file"); setError(null); }}
            className={`pb-2.5 text-sm font-semibold transition border-b-2 -mb-px ${
              activeTab === "file" ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            Upload File (Excel / CSV / Docs / PDF)
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("paste"); setError(null); }}
            className={`pb-2.5 text-sm font-semibold transition border-b-2 -mb-px ${
              activeTab === "paste" ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            Paste Text / CSV / JSON
          </button>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm font-medium text-danger">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Tab 1: File Upload */}
        {activeTab === "file" && (
          <div className="flex flex-col gap-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-canvas/60 hover:bg-canvas transition cursor-pointer text-center group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.doc,.docx,.pdf,.txt,.json,.tsv"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <FileUp className="size-6" />
              </div>
              <p className="text-sm font-bold text-ink">
                {file ? file.name : "Click to select a file from your computer"}
              </p>
              <p className="text-xs text-muted mt-1 max-w-sm">
                Supported formats: <strong>Excel (.xlsx, .xls)</strong>, <strong>CSV</strong>, <strong>Word (.docx, .doc)</strong>, <strong>PDF</strong>, Text or JSON.
              </p>
            </div>
            {parsing && <p className="text-xs text-muted animate-pulse">Extracting and reading problems from document...</p>}
          </div>
        )}

        {/* Tab 2: Paste Text */}
        {activeTab === "paste" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label htmlFor="bulk-paste" className="text-xs font-semibold uppercase tracking-wider text-muted">
                Paste CSV or Formatted Problem Text
              </label>
              <button
                type="button"
                className="text-xs font-semibold text-primary hover:underline"
                onClick={() => {
                  setPasteText(`title,topic,difficulty,statement\nTwo Sum,Arrays,Easy,Given an array of integers nums and an integer target return indices of the two numbers such that they add up to target.\nValid Anagram,Strings,Easy,Given two strings s and t return true if t is an anagram of s and false otherwise.\nMerge Intervals,Arrays,Medium,Given an array of intervals merge all overlapping intervals into one.`);
                }}
              >
                Insert sample CSV
              </button>
            </div>
            <textarea
              id="bulk-paste"
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="e.g.&#10;title,topic,difficulty,statement&#10;Two Sum,Arrays,Easy,Given an array of integers...&#10;Reverse Linked List,Linked List,Easy,Given the head of a singly linked list..."
              className="w-full rounded-xl border border-border bg-surface p-3 font-mono text-xs text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button type="button" tone="secondary" onClick={handleParsePasted} className="self-end !min-h-9 !py-1.5 !px-3 !text-xs">
              <Sparkles className="size-3.5" /> Parse Problems
            </Button>
          </div>
        )}

        {/* Parsed Problems Preview */}
        {parsedItems.length > 0 && (
          <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                <span className="text-sm font-bold text-ink">
                  {parsedItems.length} problem{parsedItems.length === 1 ? "" : "s"} ready to import
                </span>
              </div>
              <span className="text-xs text-muted">Review below before confirming</span>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-border/60 rounded-xl border border-border/80 bg-canvas/50">
              {parsedItems.map((item, idx) => (
                <div key={idx} className="p-3 text-xs flex items-start gap-3">
                  <span className="font-mono text-muted shrink-0 w-6">#{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm font-bold text-ink">{item.title}</strong>
                      <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                        {item.topic}
                      </span>
                      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                        item.difficulty === "Hard" ? "bg-danger/10 text-danger" : item.difficulty === "Medium" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                      }`}>
                        {item.difficulty}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-muted mt-1">{item.statement}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setParsedItems(parsedItems.filter((_, i) => i !== idx))}
                    title="Remove item"
                    className="text-muted hover:text-danger p-1 rounded transition"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-border">
          <Button tone="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            tone="primary"
            onClick={handleConfirmUpload}
            disabled={parsedItems.length === 0 || busy}
            loading={busy}
          >
            Import {parsedItems.length > 0 ? `${parsedItems.length} Problems` : ""}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
