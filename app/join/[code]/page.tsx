import { redirect } from "next/navigation";
import { normalizeRoomCode } from "@/lib/utils";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = normalizeRoomCode(code);

  if (normalized.length !== 8) {
    redirect("/");
  }

  redirect(`/?join=${normalized}`);
}
