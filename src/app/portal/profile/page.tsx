import ProfileForm from "@/components/ProfileForm";
import { requireUser } from "@/lib/session";

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <div className="max-w-2xl">
      <p className="log-label text-brand">Account</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-field">
        My profile
      </h1>
      <p className="mt-2 text-stone">Keep your contact details current and manage your blood-donor listing.</p>
      <div className="mt-8">
        <ProfileForm
          user={{
            full_name: user.full_name,
            official_email: user.official_email,
            service_id: user.service_id,
            mobile: user.mobile,
            designation: user.designation,
            posting: user.posting,
            blood_group: user.blood_group,
            blood_available: user.blood_available,
            avatar_url: user.avatar_url,
          }}
        />
      </div>
    </div>
  );
}
