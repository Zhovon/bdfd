import ProfileForm from "@/components/ProfileForm";
import { requireUser } from "@/lib/session";
import { getDict } from "@/lib/i18n";

export default async function ProfilePage() {
  const user = await requireUser();
  const t = (await getDict()).profile;
  return (
    <div className="max-w-2xl">
      <p className="log-label text-brand">{t.kicker}</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-field">
        {t.title}
      </h1>
      <p className="mt-2 text-stone">{t.intro}</p>
      <div className="mt-8">
        <ProfileForm
          user={{
            full_name: user.full_name,
            email: user.email,
            address: user.address,
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
