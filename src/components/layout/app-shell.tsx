import SiteHeader from "@/components/layout/site-header";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="bg-paper text-ink relative min-h-dvh overflow-x-hidden">
      <div className="paper-grain pointer-events-none absolute inset-0 z-0" />
      <SiteHeader />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
