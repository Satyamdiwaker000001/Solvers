import { cn } from "./cn.js";

export function Field({ label, hint, error, htmlFor, children, required }) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">
        {label} {required && <span aria-hidden="true" className="text-danger">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-[13px] font-medium text-danger">{error}</p>
      )}
    </div>
  );
}

const inputCls = (error) =>
  cn(
    "w-full min-w-0 rounded-lg border bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted/70",
    error ? "border-danger" : "border-border focus:border-primary",
  );

export function TextInput({ error, ...props }) {
  return <input aria-invalid={Boolean(error)} className={inputCls(error)} {...props} />;
}

export function Select({ error, children, ...props }) {
  return (
    <select aria-invalid={Boolean(error)} className={inputCls(error)} {...props}>
      {children}
    </select>
  );
}

export function TextArea({ error, ...props }) {
  return <textarea aria-invalid={Boolean(error)} rows={5} className={cn(inputCls(error), "resize-y leading-relaxed")} {...props} />;
}
