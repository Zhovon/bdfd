import PostBoard from "@/components/PostBoard";
import PollCard from "@/components/PollCard";
import PollResults from "@/components/PollResults";
import ModuleHeader from "@/components/ModuleHeader";
import { requireUser } from "@/lib/session";
import { listPosts, getActivePoll, getUserVote, listClosedPolls, getUserVotes } from "@/lib/content";
import { getModule } from "@/lib/site";

const mod = getModule("travel")!;

export default async function TravelPage() {
  const user = await requireUser();
  const [posts, poll, closed] = await Promise.all([
    listPosts("travel"),
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
        Tour programmes &amp; plans
      </h2>
      <div className="mt-4">
        <PostBoard posts={posts} empty="No tour programmes posted yet." />
      </div>

      {closed.length > 0 && (
        <>
          <h2 className="mt-12 font-[family-name:var(--font-display)] text-xl font-bold text-field">
            Past polls
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
