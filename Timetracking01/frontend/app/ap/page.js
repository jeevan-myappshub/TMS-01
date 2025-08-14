"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminSidebar from "../../components/adminsidebar";

// Constants
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";
const PROJECT_PAGE_SIZE = 5;
const toastConfig = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: true,
};

// Environment variable check
if (!process.env.NEXT_PUBLIC_BACKEND_URL && process.env.NODE_ENV === "production") {
  console.warn("NEXT_PUBLIC_BACKEND_URL is not set. Using default localhost URL.");
}

// Search Form Component
function SearchForm({
  searchQuery,
  setSearchQuery,
  loading,
  handleSearch,
  handleClearSearch,
}) {
  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
      <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="search-query" className="text-sm font-medium text-gray-700">
            Search Projects
          </Label>
          <Input
            id="search-query"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by project name"
            className="mt-1 border-gray-300 focus:ring-blue-500 text-sm"
            aria-label="Search by project name"
            disabled={loading}
          />
        </div>
        <div className="md:col-span-2 flex justify-end gap-2">
          <Button
            type="submit"
            variant="default"
            size="sm"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            aria-label="Search projects"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Searching...
              </span>
            ) : (
              "Search"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearSearch}
            disabled={loading}
            aria-label="Clear search filters"
            className="text-gray-700 hover:bg-gray-100"
          >
            Clear
          </Button>
        </div>
      </form>
    </div>
  );
}

// Project Table Component
function ProjectTable({
  projects,
  currentPage,
  handlePageChange,
  totalPages,
}) {
  const paginatedProjects = useMemo(() => {
    return projects.slice(
      (currentPage - 1) * PROJECT_PAGE_SIZE,
      currentPage * PROJECT_PAGE_SIZE
    );
  }, [projects, currentPage]);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-sm font-semibold text-gray-700 py-3">ID</TableHead>
            <TableHead className="text-sm font-semibold text-gray-700 py-3">Name</TableHead>
            <TableHead className="text-sm font-semibold text-gray-700 py-3">Description</TableHead>
            <TableHead className="text-sm font-semibold text-gray-700 py-3">Managers</TableHead>
            <TableHead className="text-sm font-semibold text-gray-700 py-3">Team Members</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedProjects.map((proj, index) => (
            <TableRow
              key={proj.project_id}
              className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-gray-100" : "bg-white"}`}
            >
              <TableCell className="py-3 text-gray-800 text-sm">{proj.project_id}</TableCell>
              <TableCell className="py-3 text-gray-800 text-sm">{proj.project_name}</TableCell>
              <TableCell className="py-3 text-gray-800 text-sm">{proj.description || "N/A"}</TableCell>
              <TableCell className="py-3 text-gray-800 text-sm">
                {proj.managers.length > 0
                  ? proj.managers.map((m) => m.name).join(", ")
                  : "None"}
              </TableCell>
              <TableCell className="py-3 text-gray-800 text-sm">
                {proj.team_members.length > 0
                  ? proj.team_members.map((m) => m.name).join(", ")
                  : "None"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-4 space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page of projects"
            className="text-gray-700 hover:bg-gray-100"
          >
            Previous
          </Button>
          <span className="text-xs text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page of projects"
            className="text-gray-700 hover:bg-gray-100"
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}

// Main ProjectsPage Component
export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const abortControllerRef = useRef(null);

  // Fetch projects data
  useEffect(() => {
    const fetchProjectsData = async () => {
      setLoading(true);
      abortControllerRef.current = new AbortController();
      try {
        const res = await fetch(`${BASE_URL}/api/projects/all`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: abortControllerRef.current.signal,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed to fetch projects: ${res.statusText}`);
        }
        const data = await res.json();
        const sortedProjects = Array.isArray(data)
          ? data.sort((a, b) => a.project_id - b.project_id)
          : [];
        setProjects(sortedProjects);
        setAllProjects(sortedProjects);
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("Error fetching projects:", error);
        toast.error(error.message || "Failed to fetch projects", toastConfig);
      } finally {
        setLoading(false);
      }
    };
    fetchProjectsData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Search handler
  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const trimmedQuery = searchQuery.trim();
      const params = new URLSearchParams();
      if (trimmedQuery) {
        params.append("search", trimmedQuery);
      }

      abortControllerRef.current = new AbortController();
      const res = await fetch(`${BASE_URL}/api/projects/all?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to fetch projects: ${res.statusText}`);
      }
      const data = await res.json();
      const sortedProjects = Array.isArray(data)
        ? data.sort((a, b) => a.project_id - b.project_id)
        : [];
      setProjects(sortedProjects);
      setCurrentPage(1);
      toast.success(
        `Found ${sortedProjects.length} project${sortedProjects.length === 1 ? "" : "s"}`,
        toastConfig
      );
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("Error in search:", error);
      toast.error(error.message || "Failed to filter projects", toastConfig);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Clear search handler
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setProjects(allProjects);
    setCurrentPage(1);
    toast.success("Filters cleared, showing all projects", toastConfig);
  }, [allProjects]);

  // Pagination
  const totalPages = Math.ceil(projects.length / PROJECT_PAGE_SIZE);
  const handlePageChange = useCallback((page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  }, [totalPages]);

  // Sidebar dialog handlers (passed to AdminSidebar)
  const [showAddEmployeeDialog, setShowAddEmployeeDialog] = useState(false);
  const [showAddDepartmentDialog, setShowAddDepartmentDialog] = useState(false);
  const [showAddDesignationDialog, setShowAddDesignationDialog] = useState(false);
  const [showAddProjectDialog, setShowAddProjectDialog] = useState(false);

  // Handle sidebar toggle
  const handleToggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar 
        setShowAddEmployeeDialog={setShowAddEmployeeDialog}
        setShowAddDepartmentDialog={setShowAddDepartmentDialog}
        setShowAddDesignationDialog={setShowAddDesignationDialog}
        setShowAddProjectDialog={setShowAddProjectDialog}
        onToggleSidebar={handleToggleSidebar}
      />
      <div
        className={`flex-1 p-4 transition-all duration-300 ${
          isSidebarExpanded ? "ml-64" : "ml-16"
        }`}
      >
        <ToastContainer {...toastConfig} />
        <Card className="w-full shadow-md rounded-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4">
            <CardTitle className="text-xl font-bold">Projects Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <SearchForm
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              loading={loading}
              handleSearch={handleSearch}
              handleClearSearch={handleClearSearch}
            />
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">All Projects</h2>
              {projects.length > 0 && (
                <span className="text-xs text-gray-600">
                  Showing {projects.length} project{projects.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            {loading ? (
              <div className="flex justify-center items-center py-6">
                <svg
                  className="animate-spin h-8 w-8 text-blue-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-gray-500 text-center py-6 text-sm">
                No projects found.
              </div>
            ) : (
              <ProjectTable
                projects={projects}
                currentPage={currentPage}
                handlePageChange={handlePageChange}
                totalPages={totalPages}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}