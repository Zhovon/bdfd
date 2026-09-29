"use client";

/**
 * A submit button that asks before a destructive action. Drop-in for a plain
 * <button> inside a server-action <form>: cancelling the dialog stops the submit.
 */
export default function ConfirmButton({
  message,
  className,
  children,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
