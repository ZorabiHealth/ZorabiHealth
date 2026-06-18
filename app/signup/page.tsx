import Index from "@/components/ui/travel-connect-signin-1";

interface Props {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function SignupPage({ searchParams }: Props) {
  const { redirect } = await searchParams;
  return <Index defaultMode="signup" redirectTo={redirect || "/dashboard"} />;
}
