import { Link } from "react-router-dom";
import { ShieldAlert, Compass } from "lucide-react";
import { Card } from "../components/ui/Card.jsx";
import { DemoBadge } from "../components/layout/Chrome.jsx";

export function ForbiddenPage() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-4">
      <Card className="text-center">
        <ShieldAlert aria-hidden="true" className="mx-auto size-9 text-warning" />
        <h1 className="page-title mt-2">Access unavailable</h1>
        <p className="mt-1 text-sm text-muted">Your demo role can’t open this area. Switch personas to explore the other console — real permission checks live on the backend.</p>
        <Link to="/sign-in" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">Back to sign in</Link>
      </Card>
      <div className="mt-4"><DemoBadge /></div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-4">
      <Card className="text-center">
        <Compass aria-hidden="true" className="mx-auto size-9 text-primary" />
        <h1 className="page-title mt-2">Page not found</h1>
        <p className="mt-1 text-sm text-muted">The link may be wrong or the item archived.</p>
        <Link to="/" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">Go home</Link>
      </Card>
    </div>
  );
}
