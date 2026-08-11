import { AuthProvider } from "@/context/auth-context";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="main-wrapper bg-white">
      <AuthProvider>{children}</AuthProvider>
    </div>
  );
}
