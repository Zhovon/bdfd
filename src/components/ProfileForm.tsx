"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileState } from "@/app/portal/actions";
import { BLOOD_GROUPS } from "@/lib/site";
import { useI18n } from "@/components/I18nProvider";

type Props = {
  user: {
    full_name: string;
    official_email: string;
    service_id: string;
    mobile: string;
    designation: string;
    posting: string;
    blood_group: string | null;
    blood_available: boolean;
    avatar_url: string | null;
  };
};

export default function ProfileForm({ user }: Props) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(updateProfileAction, null);
  const t = useI18n().t.profile;

  return (
    <form action={formAction} className="grid gap-6">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={user.avatar_url ?? "/avatar-placeholder.svg"}
          alt=""
          className="h-16 w-16 rounded-full border border-line object-cover"
        />
        <label className="text-sm">
          <span className="log-label text-field">{t.photo}</span>
          <input name="avatar" type="file" accept="image/*" className="mt-2 block text-sm text-stone" />
        </label>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <ReadOnly label={t.fullName} value={user.full_name} />
        <ReadOnly label={t.email} value={user.official_email} />
        <ReadOnly label={t.serviceId} value={user.service_id} />

        <Field name="mobile" label={t.mobile} defaultValue={user.mobile} />
        <Field name="designation" label={t.designation} defaultValue={user.designation} />
        <Field name="posting" label={t.posting} defaultValue={user.posting} full />
      </div>

      <fieldset className="rounded-lg border border-line p-5">
        <legend className="log-label px-2 text-brand">{t.bloodDonation}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="log-label text-field">{t.bloodGroup}</span>
            <select
              name="bloodGroup"
              defaultValue={user.blood_group ?? ""}
              className="mt-2 w-full border-b-2 border-line bg-transparent pb-2 text-lg text-field outline-none focus:border-brand"
            >
              <option value="">—</option>
              {BLOOD_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-3 self-end pb-2">
            <input
              name="bloodAvailable"
              type="checkbox"
              defaultChecked={user.blood_available}
              className="h-4 w-4 accent-[var(--brand)]"
            />
            <span className="text-field">{t.listMe}</span>
          </label>
        </div>
      </fieldset>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand px-8 py-3 font-semibold text-husk transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {pending ? t.saving : t.save}
        </button>
        {state && (
          <span className={`text-sm ${state.ok ? "text-brand" : "text-grain"}`}>{state.message}</span>
        )}
      </div>
    </form>
  );
}

function Field({ name, label, defaultValue, full }: { name: string; label: string; defaultValue: string; full?: boolean }) {
  return (
    <label className={full ? "sm:col-span-2" : ""}>
      <span className="log-label text-field">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full border-b-2 border-line bg-transparent pb-2 text-lg text-field outline-none focus:border-brand"
      />
    </label>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="log-label text-stone">{label}</span>
      <p className="mt-2 border-b-2 border-line pb-2 text-lg text-stone">{value}</p>
    </div>
  );
}
