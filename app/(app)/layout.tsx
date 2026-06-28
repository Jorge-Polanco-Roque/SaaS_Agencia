import { requireSession } from "@/lib/auth/session";
import { can, ROLE_LABELS } from "@/lib/auth/rbac";
import { NAV_ITEMS } from "@/lib/nav";
import { AppShell } from "@/components/app-shell";
import { CopilotoPanel } from "@/components/copiloto/copiloto-panel";
import { LiveDevOverlayLoader } from "@/components/livedev-overlay-loader";
import { LiveDevOnboarding } from "@/components/livedev-onboarding";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();
  const items = NAV_ITEMS.filter((i) => !i.cap || can(user.rol, i.cap));

  return (
    <>
      <AppShell
        items={items}
        nombre={user.nombre}
        rolLabel={ROLE_LABELS[user.rol]}
      >
        {children}
      </AppShell>
      <CopilotoPanel />
      <LiveDevOverlayLoader
        appId={process.env.NEXT_PUBLIC_LIVEDEV_APP_ID}
        token={process.env.NEXT_PUBLIC_LIVEDEV_TOKEN}
        enabled={process.env.NEXT_PUBLIC_LIVEDEV_ENABLED !== "false"}
      />
      <LiveDevOnboarding />
    </>
  );
}
