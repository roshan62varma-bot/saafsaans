"use client";

import { useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { ProfileForm } from "@/components/ProfileForm";
import { saveProfile, useProfile } from "@/lib/client/profileStore";
import type { Profile } from "@/lib/types";

/** Top-level switch: household setup first, then the personalised dashboard. */
export function App() {
  const profile = useProfile();
  const [editing, setEditing] = useState(false);

  const handleSave = (next: Profile) => {
    saveProfile(next);
    setEditing(false);
  };

  if (!profile || editing) {
    return (
      <ProfileForm
        initial={profile}
        onSave={handleSave}
        onCancel={profile ? () => setEditing(false) : undefined}
      />
    );
  }
  return <Dashboard profile={profile} onEdit={() => setEditing(true)} />;
}
