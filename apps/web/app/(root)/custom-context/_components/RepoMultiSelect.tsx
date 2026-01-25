"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Check, X } from "lucide-react";

interface Repository {
  _id: string;
  fullName: string;
  repositoryId?: number;
}

interface RepoMultiSelectProps {
  availableRepos: Repository[];
  selectedRepos: string[];
  onSelectionChange: (repos: string[]) => void;
  loading?: boolean;
  onOpen?: () => void;
}

export const RepoMultiSelect: React.FC<RepoMultiSelectProps> = ({
  availableRepos,
  selectedRepos,
  onSelectionChange,
  loading,
  onOpen,
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && onOpen) {
      onOpen();
    }
  };

  const handleToggle = (repoId: string) => {
    if (selectedRepos.includes(repoId)) {
      onSelectionChange(selectedRepos.filter((id) => id !== repoId));
    } else {
      onSelectionChange([...selectedRepos, repoId]);
    }
  };

  const handleRemove = (repoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selectedRepos.filter((id) => id !== repoId));
  };

  const filteredRepos = availableRepos.filter((repo) =>
    repo.fullName.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between min-h-[42px] h-auto"
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedRepos.length === 0 ? (
              <span className="text-muted-foreground">all</span>
            ) : (
              selectedRepos.slice(0, 2).map((repoId) => {
                const repoName = availableRepos.find((r) => r._id === repoId)?.fullName;
                return (
                  <Badge
                    key={repoId}
                    variant="secondary"
                    className="text-xs"
                    onClick={(e) => handleRemove(repoId, e)}
                  >
                    {repoName || repoId}
                    <X className="ml-1 h-3 w-3 cursor-pointer" />
                  </Badge>
                );
              })
            )}
            {selectedRepos.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{selectedRepos.length - 2} more
              </Badge>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search repositories..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {loading ? (
              <div className="py-6 text-center text-sm">Loading repositories...</div>
            ) : filteredRepos.length === 0 ? (
              <CommandEmpty>No repositories found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredRepos.map((repo) => {
                  const isSelected = selectedRepos.includes(repo._id);
                  return (
                    <CommandItem
                      key={repo._id}
                      value={repo.fullName}
                      onSelect={() => handleToggle(repo._id)}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          isSelected ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      {repo.fullName}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
