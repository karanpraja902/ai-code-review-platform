"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconBrandBitbucket } from "@tabler/icons-react";
import React from "react";
import { useUser } from "@clerk/nextjs";

const ConnectBitbucketCard = () => {
  const { user } = useUser();
  
  const handleConnectBitbucket = () => {
    if (!user) {
      alert("Please login first");
      return;
    }
    
    // Redirect to backend OAuth endpoint with userId
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    window.location.href = `${apiUrl}/api/bitbucket/oauth/connect?userId=${user.id}`;
  };

  return (
    <Card className="mx-auto mb-8 w-full p-5">
      <div>
        <h2 className="text-xl font-bold">Connect Bitbucket</h2>
        <span className="text-muted-foreground text-sm">
          {" "}
          Connect your Bitbucket workspace to sync repositories, <br />{" "}
          analyze pull requests, and track activity.
        </span>
      </div>

      <CardContent className="p-0">
        <Button 
          className="cursor-pointer"
          onClick={handleConnectBitbucket}
          disabled={!user}
        >
          <div className="flex items-center gap-2">
            <IconBrandBitbucket className="h-4 w-4" />
            Connect Bitbucket
          </div>
        </Button>
      </CardContent>
    </Card>
  );
};

export default ConnectBitbucketCard;
