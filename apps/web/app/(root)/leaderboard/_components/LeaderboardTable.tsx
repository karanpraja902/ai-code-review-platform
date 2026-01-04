"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { useDebouncedCallback } from "use-debounce";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Trophy } from "lucide-react";
import { getLeaderboard, LeaderboardItem } from "../_actions/getLeaderboard";
import Link from "next/link";

export default function LeaderboardTable() {
  const [data, setData] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [days, setDays] = useState("7");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const fetchData = async (pageVal = pagination.page, searchVal = search, daysVal = days) => {
    setLoading(true);
    try {
      const res = await getLeaderboard({
        page: pageVal,
        limit: pagination.limit,
        query: searchVal,
        days: parseInt(daysVal, 10),
      });

      if (res && res.success) {
        setData(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useDebouncedCallback((val: string) => {
    setSearch(val);
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchData(1, val, days);
  }, 500);

  const handleDaysChange = (val: string) => {
    setDays(val);
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchData(1, search, val);
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    fetchData(newPage, search, days);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by username..."
            className="pl-9"
            onChange={(e) => handleSearch(e.target.value)}
            defaultValue={search}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Period:</span>
          <Select value={days} onValueChange={handleDaysChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="15">Last 15 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md min-h-[70vh] border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Rank</TableHead>
              <TableHead>Author</TableHead>
              <TableHead className="text-right">PRs Reviewed</TableHead>
              <TableHead className="text-right">Lines Reviewed</TableHead>
              <TableHead className="text-right">PRs Merged</TableHead>
              <TableHead className="text-right">Last PR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading rankings...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No data found for this period.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.username}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {item.rank <= 3 && (
                        <Trophy
                          className={`h-4 w-4 ${
                            item.rank === 1
                              ? "text-yellow-500"
                              : item.rank === 2
                              ? "text-gray-400"
                              : "text-amber-700"
                          }`}
                        />
                      )}
                      <span className={item.rank <= 3 ? "font-bold" : ""}>#{item.rank}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={item.avatar} 
                        alt={item.username} 
                        className="h-8 w-8 rounded-full bg-muted object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${item.username}&background=random`;
                        }}
                      />
                      <div className="flex flex-col">
                        <Link
                          href={`https://github.com/${item.username}`}
                          target="_blank"
                          className="font-medium hover:underline flex items-center gap-1"
                        >
                          {item.name || item.username}
                        </Link>
                        {item.name && item.name !== item.username && (
                           <span className="text-xs text-muted-foreground">@{item.username}</span>
                        )}
                       
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{item.totalPRs}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-medium">{item.totalLinesCommitted.toLocaleString()}</span>
                      <div className="flex gap-1 text-xs">
                        <span className="text-green-600">+{item.totalAdditions}</span>
                        <span className="text-red-500">-{item.totalDeletions}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.totalMerged}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {item.lastPRDate ? format(new Date(item.lastPRDate), "MMM d, yyyy") : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium">{data.length}</span> of{" "}
          <span className="font-medium">{pagination.total}</span> users
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1 || loading}
          >
            Previous
          </Button>
          <div className="text-sm font-medium">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || loading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
