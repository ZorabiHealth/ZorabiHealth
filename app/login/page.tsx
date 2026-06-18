import Index from "@/components/ui/travel-connect-signin-1";

interface Props {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { redirect } = await searchParams;
  return <Index defaultMode="signin" redirectTo={redirect || "/dashboard"} />;
}
