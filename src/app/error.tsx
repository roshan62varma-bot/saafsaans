"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="card mx-auto my-12 max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p>We couldn&apos;t load this page. Your saved household details are safe in this browser.</p>
      <button type="button" className="btn btn-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
