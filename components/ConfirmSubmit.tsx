"use client";

// A submit button that asks "are you sure?" first (used for deletes in the admin).
export default function ConfirmSubmit({ message, label, className, children }: { message: string; label?: string; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      aria-label={label}
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
