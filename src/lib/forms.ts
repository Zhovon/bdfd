"use client";

import { startTransition } from "react";

/**
 * React 19 resets a form's fields after every `action` submission, even when
 * the action returns a validation error, so a wrong password clears the email
 * and a rejected notice loses everything typed into the editor. Use this as the
 * form's `onSubmit` (alongside `action`, which still works before hydration or
 * without JS): it submits the same FormData through the action but skips the
 * automatic reset, so the user's input stays put. Reset explicitly on success
 * where a blank form is wanted.
 */
export function submitKeepingInput(dispatch: (formData: FormData) => void) {
  return (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  };
}
