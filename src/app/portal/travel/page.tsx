import PostBoard from "@/components/PostBoard";
import Pagination from "@/components/Pagination";
import PollCard from "@/components/PollCard";
import PollResults from "@/components/PollResults";
import ModuleHeader from "@/components/ModuleHeader";
import { requireUser } from "@/lib/session";
import { listPostsPaged, getActivePoll, getUserVote, listClosedPolls, getUserVotes } from "@/lib/content";
import { getModule } from "@/lib/site";
import { getDict } from "@/lib/i18n";

const mod = getModule("travel")!;

export default async function TravelPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUser();
  const { page } = await searchParams;
  const [t, postPage, poll, closed] = await Promise.all([
    getDict(),
    listPostsPaged("travel", Number(page) || 1),
    getActivePoll(),
    listClosedPolls(),
  ]);
  const myVote = poll ? await getUserVote(poll.id, user.id) : null;
  const myPastVotes = await getUserVotes(closed.map((p) => p.id), user.id);

  return (
    <div>
      <ModuleHeader mod={mod} />

      {poll && (
        <div className="mt-8">
          <PollCard poll={poll} myVote={myVote} />
        </div>
      )}

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-xl font-bold text-field">
        {t.boardsPage.tourProgrammes}
      </h2>
      <div className="mt-4">
        <PostBoard posts={postPage.items} empty={t.boardsPage.noTours} />
      </div>
      <Pagination page={postPage.page} pageCount={postPage.pageCount} basePath="/portal/travel" />

      {closed.length > 0 && (
        <>
          <h2 className="mt-12 font-[family-name:var(--font-display)] text-xl font-bold text-field">
            {t.boardsPage.pastPolls}
          </h2>
          <div className="mt-4 grid gap-4">
            {closed.map((p) => (
              <PollResults key={p.id} poll={p} myVote={myPastVotes[p.id] ?? null} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
