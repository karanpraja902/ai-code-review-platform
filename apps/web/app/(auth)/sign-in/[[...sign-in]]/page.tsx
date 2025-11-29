import { SignIn } from "@clerk/nextjs";

export default function SignInPage({
  searchParams,
}: {
  searchParams: { source?: string; scheme?: string };
}) {
  // Check if this is an extension login
  const isExtensionAuth = searchParams.source === "extension";
  const scheme = searchParams.source === "extension" ? searchParams.scheme : undefined;

  // Construct callback URL with scheme if present
  const callbackUrl = isExtensionAuth 
    ? `/extension-auth-callback${scheme ? `?scheme=${scheme}` : ''}`
    : undefined;

  return (
    <div className="bg-foreground flex w-full min-h-screen items-center justify-center p-6 md:p-10">
      <SignIn
        // If logging in from extension, redirect to extension callback after auth
        forceRedirectUrl={callbackUrl}
      />
    </div>
  );
}
