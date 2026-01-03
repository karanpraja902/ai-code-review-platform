"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Loader2, Users, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { _config } from "@/lib/_config";
import { toast } from "sonner";

interface InvitationData {
  _id: string;
  teamId: string;
  inviterName: string;
  role: "admin" | "member";
  team: {
    _id: string;
    name: string;
    description?: string;
  } | null;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const inviteId = params.id as string;

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!isSignedIn) {
        setLoading(false);
        return;
      }

      try {
        const token = await getToken();
        const res = await fetch(`${_config.API_BASE_URL}/api/team/invites/${inviteId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (data.success) {
          setInvitation(data.data);
        } else {
          setError(data.message || "Failed to load invitation");
        }
      } catch (err) {
        console.error("Error fetching invitation:", err);
        setError("Failed to load invitation");
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [inviteId, getToken, isSignedIn]);

  const handleAccept = async () => {
    setProcessing(true);
    try {
      const token = await getToken();
      const res = await fetch(`${_config.API_BASE_URL}/api/team/invites/${inviteId}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`You have joined ${invitation?.team?.name || "the team"}!`);
        router.push("/dashboard");
      } else {
        toast.error(data.message || "Failed to accept invitation");
      }
    } catch (err) {
      console.error("Error accepting invitation:", err);
      toast.error("Failed to accept invitation");
    } finally {
      setProcessing(false);
    }
  };

  const handleIgnore = async () => {
    setProcessing(true);
    try {
      const token = await getToken();
      const res = await fetch(`${_config.API_BASE_URL}/api/team/invites/${inviteId}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Invitation ignored");
        router.push("/dashboard");
      } else {
        toast.error(data.message || "Failed to ignore invitation");
      }
    } catch (err) {
      console.error("Error ignoring invitation:", err);
      toast.error("Failed to ignore invitation");
    } finally {
      setProcessing(false);
    }
  };

  const getTeamInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>
              Please sign in to view this invitation
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!invitation || !invitation.team) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invitation not found</CardTitle>
            <CardDescription>
              This invitation may have expired or been revoked.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {/* Team Logo */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-xl bg-primary/20 flex items-center justify-center">
              <span className="text-4xl font-bold text-primary">
                {getTeamInitial(invitation.team.name)}
              </span>
            </div>
          </div>

          <CardTitle className="text-2xl">You&apos;re invited!</CardTitle>
          <CardDescription className="text-base">
            <span className="font-medium">{invitation.inviterName}</span> has invited you to join
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Team Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">
                <span className="text-lg font-semibold text-primary">
                  {getTeamInitial(invitation.team.name)}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">{invitation.team.name}</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  Role: {invitation.role}
                </p>
              </div>
            </div>
            {invitation.team.description && (
              <p className="text-sm text-muted-foreground pt-2 border-t">
                {invitation.team.description}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleIgnore}
            disabled={processing}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <X className="h-4 w-4 mr-2" />
            )}
            Ignore
          </Button>
          <Button
            className="flex-1 bg-[#10B981] hover:bg-[#059669]"
            onClick={handleAccept}
            disabled={processing}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Join Team
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
