import LoginForm from "@/components/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  const safeCallbackUrl = callbackUrl?.startsWith("/") ? callbackUrl : "/dashboard";

  return <LoginForm callbackUrl={safeCallbackUrl} />;
}
