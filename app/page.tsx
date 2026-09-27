import { redirect } from "next/navigation";

// lifecharter.life is the members' app. The public sales page lives at amilynnecarroll.com/life-charter.
export default function Home() {
  redirect("/app");
}
