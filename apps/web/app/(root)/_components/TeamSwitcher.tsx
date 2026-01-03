"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Check, ChevronDown, Plus, Settings, Loader2, Mail, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { _config } from "@/lib/_config";
import { toast } from "sonner";

interface Team {
  _id: string;
  name: string;
  role: "admin" | "member";
  isOwner: boolean;
}

interface PendingInvite {
  _id: string;
  teamId: string;
  teamName: string;
  role: "admin" | "member";
}

interface TeamSwitcherProps {
  collapsed?: boolean;
}

export function TeamSwitcher({ collapsed = false }: TeamSwitcherProps) {
  const { getToken } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  
  // Create team dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Invite dialog
  const [selectedInvite, setSelectedInvite] = useState<PendingInvite | null>(null);
  const [processingInvite, setProcessingInvite] = useState(false);

  const fetchTeams = useCallback(async () => {
    try {
      const token = await getToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Fetch all user's teams and pending invites in parallel
      const [teamsRes, invitesRes, userRes] = await Promise.all([
        fetch(`${_config.API_BASE_URL}/api/team/mine`, { headers }),
        fetch(`${_config.API_BASE_URL}/api/team/invites/mine`, { headers }),
        fetch(`${_config.API_BASE_URL}/api/user`, { headers }),
      ]);
      
      const teamsData = await teamsRes.json();
      const invitesData = await invitesRes.json();
      const userData = await userRes.json();
      
      if (teamsData.success && teamsData.data) {
        setTeams(teamsData.data);
        
        const activeTeamId = userData?.user?.activeTeamId;
        
        // Set active team - prefer activeTeamId, otherwise first team
        if (activeTeamId) {
          const active = teamsData.data.find((t: Team) => t._id === String(activeTeamId));
          if (active) {
            setActiveTeam(active);
          } else if (teamsData.data.length > 0) {
            setActiveTeam(teamsData.data[0]);
          }
        } else if (teamsData.data.length > 0) {
          setActiveTeam(teamsData.data[0]);
        }
      }

      if (invitesData.success && invitesData.data) {
        setPendingInvites(invitesData.data);
      }
      
      setHasFetched(true);
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Fetch on dropdown open
  const handleDropdownOpen = (open: boolean) => {
    if (open && !hasFetched) {
      fetchTeams();
    }
  };

  const handleSwitchTeam = async (team: Team) => {
    if (team._id === activeTeam?._id) return;
    
    setSwitching(true);
    try {
      const token = await getToken();
      const res = await fetch(`${_config.API_BASE_URL}/api/user/active-team`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamId: team._id }),
      });
      
      const data = await res.json();
      if (data.success) {
        setActiveTeam(team);
        toast.success(`Switched to ${team.name}`);
        window.location.reload();
      } else {
        toast.error(data.message || "Failed to switch team");
      }
    } catch (error) {
      console.error("Error switching team:", error);
      toast.error("Failed to switch team");
    } finally {
      setSwitching(false);
    }
  };

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
        body: JSON.stringify({
          name: newTeamName.trim(),
          description: newTeamDescription.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Team created successfully!");
        setCreateOpen(false);
        setNewTeamName("");
        setNewTeamDescription("");
        fetchTeams();
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

  const handleAcceptInvite = async (invite: PendingInvite) => {
    setProcessingInvite(true);
    try {
      const token = await getToken();
      const res = await fetch(`${_config.API_BASE_URL}/api/team/invites/${invite._id}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`You have joined ${invite.teamName}!`);
        setSelectedInvite(null);
        fetchTeams();
      } else {
        toast.error(data.message || "Failed to accept invitation");
      }
    } catch (error) {
      console.error("Error accepting invite:", error);
      toast.error("Failed to accept invitation");
    } finally {
      setProcessingInvite(false);
    }
  };

  const handleIgnoreInvite = async (invite: PendingInvite) => {
    setProcessingInvite(true);
    try {
      const token = await getToken();
      const res = await fetch(`${_config.API_BASE_URL}/api/team/invites/${invite._id}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Invitation ignored");
        setSelectedInvite(null);
        setPendingInvites(prev => prev.filter(i => i._id !== invite._id));
      } else {
        toast.error(data.message || "Failed to ignore invitation");
      }
    } catch (error) {
      console.error("Error ignoring invite:", error);
      toast.error("Failed to ignore invitation");
    } finally {
      setProcessingInvite(false);
    }
  };

  // Get first letter for team icon
  const getTeamInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <>
      <DropdownMenu onOpenChange={handleDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg border bg-card/50 hover:bg-card transition-colors w-full relative",
              collapsed ? "justify-center" : "justify-between"
            )}
            disabled={switching}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center flex-shrink-0 font-semibold text-primary relative">
                {activeTeam ? getTeamInitial(activeTeam.name) : "T"}
                {pendingInvites.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {pendingInvites.length}
                  </span>
                )}
              </div>
              {!collapsed && (
                <div className="flex flex-col items-start min-w-0">
                  <span className="font-medium text-sm truncate max-w-[120px]">
                    {loading ? "Loading..." : (activeTeam?.name || "No Team")}
                  </span>
                  {!loading && (
                    <span className="text-xs text-muted-foreground capitalize">
                      {activeTeam?.isOwner ? "Owner" : activeTeam?.role || ""}
                    </span>
                  )}
                </div>
              )}
            </div>
            {!collapsed && (
              switching ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )
            )}
          </button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-56">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading teams...</span>
            </div>
          ) : (
            <>
              {/* Pending Invites Section */}
              {pendingInvites.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Pending Invites ({pendingInvites.length})
                  </DropdownMenuLabel>
                  {pendingInvites.map((invite) => (
                    <DropdownMenuItem
                      key={invite._id}
                      onClick={() => setSelectedInvite(invite)}
                      className="flex items-center gap-2 cursor-pointer bg-amber-500/10"
                    >
                      <div className="w-8 h-8 rounded-md bg-amber-500/20 flex items-center justify-center font-semibold text-amber-600">
                        {getTeamInitial(invite.teamName)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{invite.teamName}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          Invited as {invite.role}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}

              {/* Team List */}
              {teams.map((team) => (
                <DropdownMenuItem
                  key={team._id}
                  onClick={() => handleSwitchTeam(team)}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center font-semibold text-primary">
                      {getTeamInitial(team.name)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{team.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {team.isOwner ? "Owner" : team.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {activeTeam?._id === team._id && (
                      <>
                        <Link
                          href="/team"
                          onClick={(e) => e.stopPropagation()}
                          className="hidden group-hover:flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
                        >
                          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                        </Link>
                        <Check className="h-4 w-4 text-primary group-hover:hidden" />
                      </>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}

              {teams.length > 0 && <DropdownMenuSeparator />}

              {/* Create Team */}
              <DropdownMenuItem
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-md border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </div>
                <span>Create Team</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Team Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Team</DialogTitle>
            <DialogDescription>
              Create a team to collaborate with others and share repositories.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name *</Label>
              <Input
                id="teamName"
                placeholder="My Awesome Team"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamDescription">Description (optional)</Label>
              <Textarea
                id="teamDescription"
                placeholder="A brief description of your team..."
                value={newTeamDescription}
                onChange={(e) => setNewTeamDescription(e.target.value)}
                rows={3}
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

      {/* Invite Details Dialog */}
      <Dialog open={!!selectedInvite} onOpenChange={() => setSelectedInvite(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Team Invitation</DialogTitle>
            <DialogDescription>
              You&apos;ve been invited to join a team
            </DialogDescription>
          </DialogHeader>
          {selectedInvite && (
            <div className="py-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {getTeamInitial(selectedInvite.teamName)}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedInvite.teamName}</h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    Role: {selectedInvite.role}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => selectedInvite && handleIgnoreInvite(selectedInvite)}
              disabled={processingInvite}
            >
              {processingInvite ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Ignore
            </Button>
            <Button
              onClick={() => selectedInvite && handleAcceptInvite(selectedInvite)}
              disabled={processingInvite}
              className="bg-[#10B981] hover:bg-[#059669]"
            >
              {processingInvite ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Join Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

