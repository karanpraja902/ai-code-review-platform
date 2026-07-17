import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconBrandGithub } from "@tabler/icons-react";
import React from "react";

const ConnectGithubCard = () => {
  return (
    <Card className="mx-auto mb-8 w-full p-5">
      <div>
        <h2 className="text-xl font-bold">Connect GitHub to get started</h2>
        <span className="text-muted-foreground text-sm">
          {" "}
          Install the AI Code Review GitHub App to sync your repositories, <br />{" "}
          analyze code, and track activity.
        </span>
      </div>

      <CardContent className="p-0">
        <Button className="cursor-pointer">
          <a
            href={`https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME || "ai-code-review"}/installations/select_target`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <IconBrandGithub className="h-4 w-4" />
            Connect GitHub
          </a>
        </Button>
      </CardContent>
    </Card>
  );
};

export default ConnectGithubCard;
