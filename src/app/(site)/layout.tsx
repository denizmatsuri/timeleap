import AppShell from "@/components/layout/app-shell";

type SiteLayoutProps = {
  children: React.ReactNode;
};

export default function SiteLayout({ children }: SiteLayoutProps) {
  return <AppShell>{children}</AppShell>;
}
