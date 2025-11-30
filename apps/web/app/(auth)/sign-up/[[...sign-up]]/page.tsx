import { SignUp } from "@clerk/nextjs";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; scheme?: string }>;
}) {
  // Await searchParams in Next.js 15+
  const params = await searchParams;
  
  // Check if this is an extension sign-up
  const isExtensionAuth = params.source === "extension";
  const scheme = params.source === "extension" ? params.scheme : undefined;

  // Construct callback URL with scheme if present
  const callbackUrl = isExtensionAuth 
    ? `/extension-auth-callback${scheme ? `?scheme=${scheme}` : ''}`
    : "/early-access";

  return (
    <div className="bg-foreground flex w-full min-h-screen items-center justify-center p-6 md:p-10">
      <SignUp
        // If signing up from extension, redirect to extension callback after auth
        // Otherwise, redirect to early access page
        forceRedirectUrl={callbackUrl}
      />
    </div>
  );
}
