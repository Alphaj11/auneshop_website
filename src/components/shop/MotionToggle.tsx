"use client";

import { useMotionPref } from "@/components/ui/MotionPref";

export function MotionToggle() {
  const { userOff, setUserOff } = useMotionPref();
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      <button type="button" className="link-underline text-left" aria-pressed={userOff} onClick={() => setUserOff(!userOff)}>
        Animations : {userOff ? "désactivées" : "activées"}
      </button>
      <button
        type="button"
        className="link-underline text-left"
        onClick={() => {
          try {
            localStorage.removeItem("aune_intro_seen");
          } catch {}
          document.cookie = "aune_intro=; path=/; max-age=0";
          window.location.href = "/?intro=1";
        }}
      >
        Revoir l&apos;introduction
      </button>
    </div>
  );
}
