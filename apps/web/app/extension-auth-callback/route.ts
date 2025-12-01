import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

/**
 * Extension authentication callback route
 * This route is called after a user successfully authenticates via Clerk
 * when logging in from the VS Code extension.
 * 
 * Flow:
 * 1. User clicks "Login" in VS Code extension
 * 2. Browser opens to /sign-in?source=extension
 * 3. User authenticates with Clerk
 * 4. Clerk redirects here after successful auth
 * 5. We generate a session token (JWT)
 * 6. Redirect back to VS Code with the token
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const { userId } = await auth();
    
    if (!userId) {
      // Not authenticated - redirect to sign-in
      const signInUrl = new URL('/sign-in', request.url);
      signInUrl.searchParams.set('source', 'extension');
      signInUrl.searchParams.set('error', 'not_authenticated');
      return NextResponse.redirect(signInUrl);
    }

    // Get user details
    const user = await currentUser();
    
    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Generate JWT token for the extension
    const secret = process.env.EXTENSION_JWT_SECRET;
    
    if (!secret) {
      console.error('EXTENSION_JWT_SECRET is not configured');
      return new NextResponse('Server configuration error', { status: 500 });
    }

    // Create token payload
    const payload = {
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
    };

    // Sign the token
    const token = jwt.sign(payload, secret, { algorithm: 'HS256' });

    // Get the scheme from query params, default to 'vscode' if not provided
    const scheme = request.nextUrl.searchParams.get('scheme') || 'vscode';

    // Redirect back to the specific IDE with the token
    const callbackUrl = `${scheme}://ai-code-review.ai-code-review/auth-callback?token=${encodeURIComponent(token)}`;
    
    // Return HTML that auto-redirects and shows a success message
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Authentication Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #0f0f0f;
              color: #fff;
            }
            .container {
              text-align: center;
              padding: 2rem;
              max-width: 400px;
            }
            .success-icon {
              font-size: 64px;
              margin-bottom: 1rem;
            }
            h1 {
              margin: 0 0 0.5rem;
              font-size: 24px;
            }
            p {
              color: #999;
              margin: 0 0 1.5rem;
            }
            .redirect-info {
              background: #1a1a1a;
              padding: 1rem;
              border-radius: 8px;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✅</div>
            <h1>Authentication Successful!</h1>
            <p>Redirecting you back to ${scheme}...</p>
            <div class="redirect-info">
              You can close this window if you're not redirected automatically.
            </div>
          </div>
          <script>
            // Attempt to redirect to IDE
            window.location.href = '${callbackUrl}';
            
            // Show manual link after 3 seconds if redirect fails
            setTimeout(() => {
              const container = document.querySelector('.container');
              const link = document.createElement('a');
              link.href = '${callbackUrl}';
              link.textContent = 'Click here to open ${scheme}';
              link.style.cssText = 'color: #4CAF50; text-decoration: none; font-weight: 500;';
              
              const manualRedirect = document.createElement('p');
              manualRedirect.style.marginTop = '1rem';
              manualRedirect.appendChild(link);
              
              container.appendChild(manualRedirect);
            }, 3000);
          </script>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    console.error('Extension auth callback error:', error);
    return new NextResponse('Authentication failed', { status: 500 });
  }
}
