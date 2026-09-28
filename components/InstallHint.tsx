"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = "lcp-install-hint-dismissed";

// "Put LifeCharter on your phone": an Install button where the browser offers one (Android/Chrome),
// otherwise short steps (iPhone: Share → Add to Home Screen). Hidden once installed or dismissed.
export default function InstallHint() {
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {}
    const mobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setShow(!standalone && !dismissed && mobile);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  }

  if (!show) return null;
  return (
    <div className="card-warm relative flex flex-col gap-2 p-5 pr-14">
      <button onClick={dismiss} aria-label="Hide this tip" className="absolute right-2 top-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-soft hover:bg-black/5">
        <X className="h-5 w-5" aria-hidden />
      </button>
      <p className="eyebrow">Put LifeCharter on your phone</p>
      {prompt ? (
        <>
          <p className="text-[15px] text-ink">Open the program from your home screen, like an app.</p>
          <button
            onClick={async () => {
              await prompt.prompt();
              const choice = await prompt.userChoice;
              if (choice.outcome === "accepted") dismiss();
            }}
            className="btn btn-primary min-h-11 self-start"
          >
            Install the app
          </button>
        </>
      ) : ios ? (
        <p className="text-[15px] text-ink">
          In Safari, tap the <b>Share</b> button (the square with an arrow), then <b>Add to Home Screen</b>. LifeCharter will open from your home screen like an app.
        </p>
      ) : (
        <p className="text-[15px] text-ink">
          Open your browser&rsquo;s menu (⋮) and choose <b>Install app</b> or <b>Add to Home screen</b>. LifeCharter will open from your home screen like an app.
        </p>
      )}
    </div>
  );
}
