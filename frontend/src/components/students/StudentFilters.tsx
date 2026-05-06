import React from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

interface StudentFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedGrade: string;
  setSelectedGrade: (grade: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  sortBy: string;
  sortOrder: string;
  handleSort: (field: string) => void;
}

// Enhanced search with debouncing
import { useMemo, useCallback, useRef } from 'react';

const StudentFilters: React.FC<StudentFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  selectedGrade,
  setSelectedGrade,
  selectedStatus,
  setSelectedStatus,
  sortBy,
  sortOrder,
  handleSort
}) => {
  // Custom debounce implementation
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedSearch = useCallback(
    (query: string) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        setSearchQuery(query);
      }, 300);
    },
    [setSearchQuery]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Advanced filter options
  const gradeOptions = useMemo(() => [
    { value: "All", label: "All Grades" },
    { value: "Grade 1", label: "Grade 1" },
    { value: "Grade 2", label: "Grade 2" },
    { value: "Grade 3", label: "Grade 3" },
    { value: "Grade 4", label: "Grade 4" },
    { value: "Grade 5", label: "Grade 5" },
    { value: "Grade 6", label: "Grade 6" },
    { value: "Grade 7", label: "Grade 7" },
    { value: "Grade 8", label: "Grade 8" },
    { value: "Grade 9", label: "Grade 9" },
    { value: "Grade 10", label: "Grade 10" },
    { value: "Grade 11", label: "Grade 11" },
    { value: "Grade 12", label: "Grade 12" },
    { value: "Unassigned", label: "Unassigned" }
  ], []);

  const statusOptions = useMemo(() => [
    { value: "All", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "warning", label: "Warning" },
    { value: "danger", label: "At Risk" }
  ], []);
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
      <div className="flex items-center space-x-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
          <Input
            type="search"
            placeholder="Search students..."
            className="w-full pl-8 md:w-[300px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
          className="w-[180px] border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="All">All Grades</option>
          <option value="10A">Grade 10A</option>
          <option value="10B">Grade 10B</option>
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="w-[180px] border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="All">All Status</option>
          <option value="active">Active</option>
          <option value="warning">Warning</option>
          <option value="danger">At Risk</option>
        </select>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-slate-500 dark:text-slate-400">Sort by:</span>
        <Button
          variant={sortBy === "name" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => handleSort("name")}
        >
          Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
        </Button>
        <Button
          variant={sortBy === "performance" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => handleSort("performance")}
        >
          Performance {sortBy === "performance" && (sortOrder === "asc" ? "↑" : "↓")}
        </Button>
        <Button
          variant={sortBy === "attendance" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => handleSort("attendance")}
        >
          Attendance {sortBy === "attendance" && (sortOrder === "asc" ? "↑" : "↓")}
        </Button>
      </div>
    </div>
  );
};

export default StudentFilters;