import { readLocalUpload } from "@/lib/uploads";

/**
 * Serves images/PDFs saved to local disk when no object store is configured.
 * (With S3 set up, upload URLs point straight at the bucket and never reach here.)
 */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const found = await readLocalUpload(file);
  if (!found) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(found.body), {
    headers: {
      "Content-Type": found.type,
      // File names carry a random suffix and never change, so cache for good.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
