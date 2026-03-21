export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-arcaxo-bg)' }}>
      {/* Sidebar + Navbar will be added in Etapa 04 */}
      <main>{children}</main>
    </div>
  );
}
