import { useState } from "react";

function initial(name) {
  return String(name || "U").trim().slice(0, 1).toUpperCase();
}

/** GitHub avatar with a reliable initials fallback for offline/demo accounts. */
export function Avatar({ src, name, className = "", alt }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) return <img src={src} alt={alt || `${name || "User"} profile`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={className} />;
  return <span aria-label={alt || `${name || "User"} profile`} className={className}>{initial(name)}</span>;
}
