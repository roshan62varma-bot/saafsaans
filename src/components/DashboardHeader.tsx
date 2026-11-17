import type { Profile } from "@/lib/types";

const NAV = [
  ["air", "Air now"],
  ["plan", "Today's plan"],
  ["indoor", "Indoor air"],
  ["impact", "Your impact"],
  ["ask", "Ask"],
  ["community", "Community"],
] as const;

interface Props {
  profile: Profile;
  onEdit: () => void;
}

/** Page title, household summary, edit action and sticky in-page navigation. */
export function DashboardHeader({ profile, onEdit }: Props) {
  const people = profile.members.length;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Your smog-season plan</h1>
          <p className="text-muted">
            {profile.place.name} · {people} {people === 1 ? "person" : "people"}
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onEdit}>
          Edit household
        </button>
      </div>

      <nav
        aria-label="Dashboard sections"
        className="sticky top-0 z-10 -mx-4 border-b border-line bg-paper/95 px-4 py-2 backdrop-blur"
      >
        <ul className="flex gap-1 overflow-x-auto">
          {NAV.map(([id, label]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 font-bold hover:bg-surface-2"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
