"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, MoreHorizontal, Loader2, UserPlus, X, Check, Crown } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { _config } from "@/lib/_config";

interface TeamInfo {
  _id: string;
  name: string;
  ownerId: string;
  userRole: string;
  isOwner: boolean;
}

interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  username?: string;
  role: string;
  isOwner: boolean;
}

interface Invitation {
  _id: string;
  teamId: string;
  inviteeEmail: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function TeamPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invitation[]>([]);
  const [searchMember, setSearchMember] = useState("");
  const [searchInvite, setSearchInvite] = useState("");
  
  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);

  // Create team dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);

  // Subscription state
  const [isFreePlan, setIsFreePlan] = useState(true);

  const fetchTeamData = useCallback(async () => {
    try {
      const token = await getToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Fetch team info
      const infoRes = await fetch(`${_config.API_BASE_URL}/api/team/info`, { headers });
      const infoData = await infoRes.json();
      
      if (infoData.success && infoData.data) {
        setTeamInfo(infoData.data);

        // Fetch members
        const membersRes = await fetch(`${_config.API_BASE_URL}/api/team/members`, { headers });
        const membersData = await membersRes.json();
        if (membersData.success) {
          setMembers(membersData.data || []);
        }

        // Fetch pending invites (only if owner)
        if (infoData.data.isOwner) {
          const invitesRes = await fetch(`${_config.API_BASE_URL}/api/team/invites/pending`, { headers });
          const invitesData = await invitesRes.json();
          if (invitesData.success) {
            setPendingInvites(invitesData.data || []);
          }
        }
      } else {
        setTeamInfo(null);
      }
    } catch (error) {
      console.error("Error fetching team data:", error);
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // Fetch subscription status
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${_config.API_BASE_URL}/api/subscription/features`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const hasSubscription = Boolean(data?.hasSubscription);
        const planName: string | undefined = data?.subscription?.planName;
        const free = !hasSubscription || planName?.toLowerCase() === "free";
        setIsFreePlan(Boolean(free));
      } catch (e) {
        setIsFreePlan(true);
      }
    };
    fetchSubscription();
  }, [getToken]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      toast.error("Team name is required");
      return;
    }
    
    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch(`${_config.API_BASE_URL}/api/team/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success("Team created successfully!");
        setCreateOpen(false);
        setNewTeamName("");
        fetchTeamData();
      } else {
        toast.error(data.message || "Failed to create team");
      }
    } catch (error) {
      console.error("Error creating team:", error);
      toast.error("Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    
    setInviting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${_config.API_BASE_URL}/api/team/invite`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`Invitation sent to ${inviteEmail}`);
        setInviteOpen(false);
        setInviteEmail("");
        setInviteRole("member");
        fetchTeamData();
      } else {
        toast.error(data.message || "Failed to send invitation");
      }
    } catch (error) {
      console.error("Error sending invite:", error);
      toast.error("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${_config.API_BASE_URL}/api/team/invites/${inviteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success("Invitation revoked");
        fetchTeamData();
      } else {
        toast.error(data.message || "Failed to revoke invitation");
      }
    } catch (error) {
      console.error("Error revoking invite:", error);
      toast.error("Failed to revoke invitation");
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.email?.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.firstName?.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.lastName?.toLowerCase().includes(searchMember.toLowerCase())
  );

  const filteredInvites = pendingInvites.filter((i) =>
    i.inviteeEmail?.toLowerCase().includes(searchInvite.toLowerCase())
  );

  const formatExpiry = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Expired";
    if (diffDays === 1) return "1 day";
    return `${diffDays} days`;
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No team - show create team UI
  if (!teamInfo) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">No Team Yet</h1>
          <p className="text-muted-foreground">
            Create a team to collaborate with others and share repositories.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#10B981] hover:bg-[#059669] text-white">
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a New Team</DialogTitle>
              <DialogDescription>
                Enter a name for your team. You can invite members after creating it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  placeholder="My Awesome Team"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateTeam} 
                disabled={creating}
                className="bg-[#10B981] hover:bg-[#059669]"
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-8 p-8 max-w-5xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Team Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your team&apos;s details, members, and security settings.
        </p>
      </div>

      {/* Team Details Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Team Details</h2>
        </div>
        <div className="space-y-4 rounded-lg border p-4 bg-card/40">
          <div className="grid grid-cols-[200px_1fr] items-center gap-4">
            <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
              TEAM NAME
            </span>
            <Input
              value={teamInfo.name}
              readOnly
              className="h-10 border-input/50 bg-background/50 font-medium"
            />
          </div>
          <div className="grid grid-cols-[200px_1fr] items-center gap-4">
            <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
              MY ROLE
            </span>
            <Input
              value={teamInfo.isOwner ? "Owner" : teamInfo.userRole}
              readOnly
              className="h-10 border-input/50 bg-background/50 font-medium capitalize"
            />
          </div>
        </div>
      </section>

      {/* Members Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Members ({members.length})</h2>
        <Input
          placeholder="Filter by name or email..."
          value={searchMember}
          onChange={(e) => setSearchMember(e.target.value)}
          className="max-w-xs bg-background/50"
        />
        <div className="rounded-md border bg-card/40">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[300px] text-xs uppercase text-muted-foreground font-medium">Name</TableHead>
                <TableHead className="w-[300px] text-xs uppercase text-muted-foreground font-medium">Email</TableHead>
                <TableHead className="text-xs uppercase text-muted-foreground font-medium">Role</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No members found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => (
                  <TableRow key={member._id}>
                    <TableCell className="font-medium text-sm">
                      {member.firstName || member.lastName
                        ? `${member.firstName || ""} ${member.lastName || ""}`.trim()
                        : member.email}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{member.email}</TableCell>
                    <TableCell className="text-sm capitalize">
                      {member.isOwner ? "Owner" : member.role}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Invites Section - Only show for owners */}
      {teamInfo.isOwner && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pending Invites ({pendingInvites.length})</h2>
            {isFreePlan ? (
              <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white font-medium h-9 text-xs tracking-wide">
                <Link href="/upgrade">
                  <Crown className="mr-1 h-3.5 w-3.5" />
                  UPGRADE TO INVITE
                </Link>
              </Button>
            ) : (
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#10B981] hover:bg-[#059669] text-white font-medium h-9 text-xs tracking-wide">
                    <UserPlus className="mr-1 h-3.5 w-3.5" />
                    INVITE USER
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your team. They&apos;ll receive a notification.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="teammate@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleInvite} 
                    disabled={inviting}
                    className="bg-[#10B981] hover:bg-[#059669]"
                  >
                    {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Invite
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            )}
          </div>
          
          {pendingInvites.length > 0 && (
            <Input
              placeholder="Filter by email..."
              value={searchInvite}
              onChange={(e) => setSearchInvite(e.target.value)}
              className="max-w-xs bg-background/50"
            />
          )}
          
          <div className="rounded-md border bg-card/40">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px] text-xs uppercase text-muted-foreground font-medium">Email</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground font-medium">Role</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground font-medium">Expires</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No pending invites
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvites.map((invite) => (
                    <TableRow key={invite._id}>
                      <TableCell className="font-medium text-sm">{invite.inviteeEmail}</TableCell>
                      <TableCell className="text-sm capitalize">{invite.role}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatExpiry(invite.expiresAt)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleRevokeInvite(invite._id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}
