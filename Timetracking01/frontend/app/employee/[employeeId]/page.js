"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { Pencil, Users, ChevronLeft, Menu, X } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import Footer from "../../../components/footer";
import { Button } from "@/components/ui/button";
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
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";
const DAILY_LOG_PAGE_SIZE = 3;
const CHANGE_LOG_PAGE_SIZE = 3;
const toastConfig = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: true,
  pauseOnHover: true,
  draggable: true,
};

// Navbar Component
function Navbar({ isSidebarOpen, setIsSidebarOpen }) {
  return (
    <nav className="fixed top-0 left-0 right-0 bg-gradient-to-r from-indigo-500 to-blue-400 text-white shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8" />
            <h1 className="text-2xl font-bold tracking-tight">EmployeeSync</h1>
          </div>
          <button
            className="md:hidden p-2 rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </nav>
  );
}

// Sidebar Component
function Sidebar({ isSidebarOpen, setIsSidebarOpen, employeeId }) {
  return (
    <>
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-gray-300 text-white shadow-2xl transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-300 ease-in-out z-40 mt-16 md:mt-0`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold">Navigation</h2>
            <button
              className="md:hidden text-gray-300 hover:text-white"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X size={24} />
            </button>
          </div>
          <nav className="space-y-2">
            <Link href="/admin">
              <Button
                variant="default"
                className="w-full text-left flex items-center gap-3 bg-blue-600 hover:bg-gray-700 py-3 px-4 rounded-lg transition-colors"
                aria-label="Back to Admin Dashboard"
              >
                <ChevronLeft size={20} />
                <span>Back to Dashboard</span>
              </Button>
            </Link>
          </nav>
        </div>
      </div>
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </>
  );
}

// Hierarchy Tree Component
function HierarchyTree({ hierarchy, currentEmployee }) {
  const fullHierarchy = [...(hierarchy || [])].reverse().concat([currentEmployee]);

  return (
    <div className="flex flex-col items-center space-y-3 p-6 bg-gray-100 rounded-xl shadow-sm">
      {fullHierarchy.length > 0 ? (
        fullHierarchy.map((person, index) => (
          <div key={person.id || person.email || index} className="flex flex-col items-center">
            <span
              className={`text-sm font-semibold ${
                person.email === currentEmployee.email ? "text-blue-600" : "text-gray-800"
              } flex items-center gap-2`}
            >
              {person.email === currentEmployee.email && <Users size={16} />}
              {person.employee_name}
            </span>
            <span className="text-xs text-gray-500 italic">
              {person.designation?.title || "No designation"}
            </span>
            {index < fullHierarchy.length - 1 && (
              <span className="text-gray-300 text-lg my-1">↑</span>
            )}
          </div>
        ))
      ) : (
        <div className="text-gray-500 text-center text-sm">No manager hierarchy available.</div>
      )}
    </div>
  );
}

// Daily Log Changes Dialog Component
function DailyLogChangesDialog({ open, onOpenChange, logId, projects }) {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (open && logId) {
      setLoading(true);
      abortControllerRef.current = new AbortController();

      fetch(`${BASE_URL}/api/daily-logs/${logId}/changes`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: abortControllerRef.current.signal,
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((data) => {
          setChanges(Array.isArray(data) ? data : []);
          setCurrentPage(1);
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          toast.error(`Failed to fetch changes: ${err.statusText || "Unknown error"}`, toastConfig);
          setChanges([]);
        })
        .finally(() => setLoading(false));
    } else {
      setChanges([]);
      setCurrentPage(1);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [open, logId]);

  const getProjectName = (pid) => {
    if (!pid || !projects || projects.length === 0) return "Unknown";
    const proj = projects.find((p) => p.id == pid);
    return proj ? proj.name : "Unknown";
  };

  const formatChangeDateTime = (isoDate) => {
    if (!isoDate) return { day: "N/A", time: "N/A" };
    const date = new Date(isoDate);
    return {
      day: formatInTimeZone(date, "Asia/Kolkata", "eeee, MMMM d, yyyy"),
      time: formatInTimeZone(date, "Asia/Kolkata", "HH:mm"),
    };
  };

  const totalPages = Math.ceil(changes.length / CHANGE_LOG_PAGE_SIZE);
  const paginatedChanges = changes.slice(
    (currentPage - 1) * CHANGE_LOG_PAGE_SIZE,
    currentPage * CHANGE_LOG_PAGE_SIZE
  );

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-white rounded-xl shadow-lg">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-2xl font-bold text-gray-800">
            Change History for Daily Log #{logId}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
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
          ) : changes.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="text-sm font-semibold text-gray-700 py-4">Day</TableHead>
                    <TableHead className="text-sm font-semibold text-gray-700 py-4">Time</TableHead>
                    <TableHead className="text-sm font-semibold text-gray-700 py-4">Project</TableHead>
                    <TableHead className="text-sm font-semibold text-gray-700 py-4">New Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedChanges.map((change, index) => {
                    const { day, time } = formatChangeDateTime(change.changed_at);
                    return (
                      <TableRow
                        key={change.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <TableCell className="py-4 text-gray-800 text-sm">{day}</TableCell>
                        <TableCell className="py-4 text-gray-800 text-sm">{time}</TableCell>
                        <TableCell className="py-4">
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {getProjectName(change.project_id)}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 text-gray-800 text-sm">
                          {change.new_description || "N/A"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex justify-center items-center mt-6 space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Previous page of change logs"
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Next page of change logs"
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-gray-500 text-center py-6 text-sm">
              No changes recorded for this log.
            </div>
          )}
        </div>
        <DialogFooter className="border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            aria-label="Close change history dialog"
            className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const formatHours = (hours) => {
  if (!hours && hours !== 0) return "0:00";
  const totalHours = Number(hours);
  if (isNaN(totalHours)) return "0:00";
  const h = Math.floor(totalHours);
  const m = Math.round((totalHours - h) * 60);
  return `${h}:${m < 10 ? "0" : ""}${m}`;
};

export default function EmployeeDetailsPage() {
  const { employeeId } = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState(null);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [department, setDepartment] = useState(null);
  const [designation, setDesignation] = useState(null);
  const [managerHierarchy, setManagerHierarchy] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dailyLogPage, setDailyLogPage] = useState(1);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterProjectId, setFilterProjectId] = useState("all");
  const [filterStatusReview, setFilterStatusReview] = useState("all");
  const [showChangesDialog, setShowChangesDialog] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [showEditReviewerDialog, setShowEditReviewerDialog] = useState(false);
  const [selectedReviewerId, setSelectedReviewerId] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const abortControllerRef = useRef(null);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/projects`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) throw new Error(`Failed to fetch projects: ${res.statusText}`);
      const projectData = await res.json();
      return Array.isArray(projectData) ? projectData : [];
    } catch (error) {
      if (error.name === "AbortError") return [];
      console.error("Error fetching projects:", error);
      toast.error(error.message || "Failed to fetch projects", toastConfig);
      return [];
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/employees`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) throw new Error(`Failed to fetch employees: ${res.statusText}`);
      const employeeData = await res.json();
      return Array.isArray(employeeData) ? employeeData : [];
    } catch (error) {
      if (error.name === "AbortError") return [];
      console.error("Error fetching employees:", error);
      toast.error(error.message || "Failed to fetch employees", toastConfig);
      return [];
    }
  };

  const handleUpdateReviewer = async () => {
    if (!selectedReviewerId || selectedReviewerId === "none") {
      toast.error("Please select a reviewer", toastConfig);
      return;
    }
    setLoading(true);
    const abortController = new AbortController();
    try {
      const res = await fetch(`${BASE_URL}/api/employees/update-reviewer/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer_id: selectedReviewerId === "none" ? null : parseInt(selectedReviewerId) }),
        signal: abortController.signal,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to update reviewer: ${res.statusText}`);
      }
      const data = await res.json();
      toast.success(data.message, toastConfig);
      // Refresh employee data
      const empRes = await fetch(`${BASE_URL}/api/employees/${employeeId}/details`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: abortController.signal,
      });
      if (!empRes.ok) throw new Error(`Failed to fetch employee data: ${empRes.statusText}`);
      const empData = await empRes.json();
      setEmployee(empData);
      setManagerHierarchy(Array.isArray(empData.manager_hierarchy) ? empData.manager_hierarchy : []);
      setShowEditReviewerDialog(false);
      setSelectedReviewerId("");
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("Error updating reviewer:", error);
      toast.error(error.message || "Failed to update reviewer", toastConfig);
    } finally {
      setLoading(false);
      abortController.abort();
    }
  };

  useEffect(() => {
    const fetchEmployeeData = async () => {
      setLoading(true);
      abortControllerRef.current = new AbortController();
      try {
        // Fetch employee details
        const empRes = await fetch(`${BASE_URL}/api/employees/${employeeId}/details`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: abortControllerRef.current.signal,
        });
        if (!empRes.ok) throw new Error(`Failed to fetch employee data: ${empRes.statusText}`);
        const empData = await empRes.json();
        setEmployee(empData);
        setDepartment(empData.department || null);
        setDesignation(empData.designation || null);
        setManagerHierarchy(Array.isArray(empData.manager_hierarchy) ? empData.manager_hierarchy : []);

        // Fetch projects
        const projectData = await fetchProjects();
        setProjects(projectData);

        // Fetch employees for reviewer dropdown
        const employeeData = await fetchEmployees();
        setEmployees(employeeData);

        // Fetch daily logs
        const logsRes = await fetch(`${BASE_URL}/api/daily-logs/by-employee?employee_id=${employeeId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: abortControllerRef.current.signal,
        });
        if (!logsRes.ok) {
          const err = await logsRes.json();
          throw new Error(err.error || `Failed to fetch daily logs: ${logsRes.statusText}`);
        }
        const dailyLogsData = await logsRes.json();
        setDailyLogs(Array.isArray(dailyLogsData) ? dailyLogsData : []);
        setDailyLogPage(1);
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("Error fetching employee data:", error);
        toast.error(error.message || "Failed to fetch employee data", toastConfig);
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchEmployeeData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [employeeId]);

  const handleFilterDailyLogs = useCallback(async (e) => {
    e.preventDefault();
    if (!employee) {
      toast.error("No employee data available.", toastConfig);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStartDate) params.append("start_date", filterStartDate);
      if (filterEndDate) params.append("end_date", filterEndDate);
      if (filterProjectId && filterProjectId !== "all") params.append("project_id", filterProjectId);
      if (filterStatusReview && filterStatusReview !== "all") params.append("status_review", filterStatusReview);

      abortControllerRef.current = new AbortController();
      const res = await fetch(
        `${BASE_URL}/api/daily-logs/filter/${employee.id}?${params.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: abortControllerRef.current.signal,
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to fetch filtered daily logs: ${res.statusText}`);
      }
      const dailyLogsData = await res.json();
      setDailyLogs(Array.isArray(dailyLogsData.logs) ? dailyLogsData.logs : []);
      // Fetch projects if not already available
      const projectData = projects.length > 0 ? projects : await fetchProjects();
      setProjects(projectData);
      setDailyLogPage(1);
      toast.success(
        `Found ${dailyLogsData.logs.length} daily log${dailyLogsData.logs.length === 1 ? "" : "s"}`,
        toastConfig
      );
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("Error filtering daily logs:", error);
      toast.error(error.message || "Failed to filter daily logs", toastConfig);
      setDailyLogs([]);
    } finally {
      setLoading(false);
    }
  }, [employee, filterStartDate, filterEndDate, filterProjectId, filterStatusReview, projects]);

  const handleClearFilters = useCallback(() => {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterProjectId("all");
    setFilterStatusReview("all");
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch projects
        const projectData = await fetchProjects();
        setProjects(projectData);

        // Fetch daily logs
        const res = await fetch(`${BASE_URL}/api/daily-logs/by-employee?employee_id=${employeeId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `Failed to fetch daily logs: ${res.statusText}`);
        }
        const dailyLogsData = await res.json();
        setDailyLogs(Array.isArray(dailyLogsData) ? dailyLogsData : []);
        setDailyLogPage(1);
      } catch (error) {
        console.error("Error fetching daily logs:", error);
        toast.error(error.message || "Failed to fetch daily logs", toastConfig);
        setDailyLogs([]);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [employeeId]);

  const getManagerName = (reportsTo, employees) => {
    if (!reportsTo) return "None";
    const manager = employees.find((emp) => emp.id == reportsTo);
    return manager ? manager.employee_name : "Unknown";
  };

  const getProjectName = (pid) => {
    if (!pid || !projects || projects.length === 0) return "Unknown";
    const proj = projects.find((p) => p.id == pid);
    return proj ? proj.name : "Unknown";
  };

  const totalDailyLogPages = Math.ceil(dailyLogs.length / DAILY_LOG_PAGE_SIZE);
  const paginatedDailyLogs = dailyLogs.slice(
    (dailyLogPage - 1) * DAILY_LOG_PAGE_SIZE,
    dailyLogPage * DAILY_LOG_PAGE_SIZE
  );

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ToastContainer {...toastConfig} />
      <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <div className="flex flex-1 pt-16">
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          employeeId={employeeId}
        />
        <main className="flex-1 md:ml-64 p-6">
          <header className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Employee Details</h1>
            <p className="text-gray-600 mt-2">
              View and manage details for {employee.employee_name}
            </p>
          </header>
          <Card className="w-full shadow-xl rounded-xl border border-gray-200">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-400 text-white py-4 rounded-t-xl">
              <CardTitle className="text-2xl font-bold">
                Details for {employee.employee_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-gray-100 p-4 rounded-xl">
                <div>
                  <Label htmlFor="emp-name" className="text-sm font-medium text-gray-700">
                    Name
                  </Label>
                  <Input
                    id="emp-name"
                    value={employee.employee_name || ""}
                    readOnly
                    className="mt-1 border-gray-300 bg-gray-50 text-sm rounded-md"
                    aria-describedby="emp-name-desc"
                  />
                  <span id="emp-name-desc" className="sr-only">
                    Employee name: {employee.employee_name || "N/A"}
                  </span>
                </div>
                <div>
                  <Label htmlFor="emp-email" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="emp-email"
                    value={employee.email || ""}
                    readOnly
                    className="mt-1 border-gray-300 bg-gray-50 text-sm rounded-md"
                    aria-describedby="emp-email-desc"
                  />
                  <span id="emp-email-desc" className="sr-only">
                    Employee email: {employee.email || "N/A"}
                  </span>
                </div>
                <div>
                  <Label htmlFor="emp-department" className="text-sm font-medium text-gray-700">
                    Department
                  </Label>
                  <Input
                    id="emp-department"
                    value={department?.name || "No department"}
                    readOnly
                    className="mt-1 border-gray-300 bg-gray-50 text-sm rounded-md"
                    aria-describedby="emp-department-desc"
                  />
                  <span id="emp-department-desc" className="sr-only">
                    Department: {department?.name || "No department"}
                  </span>
                </div>
                <div>
                  <Label htmlFor="emp-designation" className="text-sm font-medium text-gray-700">
                    Designation
                  </Label>
                  <Input
                    id="emp-designation"
                    value={designation?.title || "No designation"}
                    readOnly
                    className="mt-1 border-gray-300 bg-gray-50 text-sm rounded-md"
                    aria-describedby="emp-designation-desc"
                  />
                  <span id="emp-designation-desc" className="sr-only">
                    Designation: {designation?.title || "No designation"}
                  </span>
                </div>
                <div>
                  <Label htmlFor="reports-to" className="text-sm font-medium text-gray-700">
                    Reports To
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="reports-to"
                      value={getManagerName(employee.reports_to, [employee, ...managerHierarchy, ...employees])}
                      readOnly
                      className="border-gray-300 bg-gray-50 text-sm rounded-md flex-1"
                      aria-describedby="reports-to-desc"
                    />
                    <Dialog open={showEditReviewerDialog} onOpenChange={setShowEditReviewerDialog}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-blue-600 hover:bg-blue-50 border-blue-600 rounded-md transition-colors"
                          aria-label="Edit reviewer"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md bg-white rounded-xl shadow-lg">
                        <DialogHeader className="border-b pb-3">
                          <DialogTitle className="text-2xl font-bold text-gray-800">
                            Update Reviewer
                          </DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                          <Label htmlFor="reviewer-select" className="text-sm font-medium text-gray-700">
                            Select New Reviewer
                          </Label>
                          <Select
                            value={selectedReviewerId}
                            onValueChange={setSelectedReviewerId}
                          >
                            <SelectTrigger id="reviewer-select" className="mt-1 text-sm rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500">
                              <SelectValue placeholder="Select a reviewer" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {employees
                                .filter((emp) => emp.id !== employee.id)
                                .map((emp) => (
                                  <SelectItem key={emp.id} value={String(emp.id)}>
                                    {emp.employee_name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter className="border-t pt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowEditReviewerDialog(false)}
                            disabled={loading}
                            aria-label="Cancel reviewer update"
                            className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleUpdateReviewer}
                            disabled={loading}
                            aria-label="Save reviewer update"
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
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
                                Saving...
                              </span>
                            ) : (
                              "Save"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <span id="reports-to-desc" className="sr-only">
                    Reports to: {getManagerName(employee.reports_to, [employee, ...managerHierarchy, ...employees])}
                  </span>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Manager Hierarchy</Label>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 text-blue-600 hover:bg-blue-50 border-blue-600 font-semibold rounded-md transition-colors"
                        aria-label="Show manager hierarchy"
                      >
                        Show Hierarchy
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-white rounded-xl shadow-lg">
                      <DialogHeader className="border-b pb-3">
                        <DialogTitle className="text-2xl font-bold text-gray-800">
                          Manager Hierarchy
                        </DialogTitle>
                      </DialogHeader>
                      <HierarchyTree
                        hierarchy={managerHierarchy}
                        currentEmployee={employee}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Filter Daily Entries</h3>
              <div className="mb-6 bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <form
                  onSubmit={handleFilterDailyLogs}
                  className="grid grid-cols-1 md:grid-cols-4 gap-4"
                >
                  <div>
                    <Label htmlFor="filter-start-date" className="text-sm font-medium text-gray-700">
                      Start Date
                    </Label>
                    <Input
                      id="filter-start-date"
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      placeholder="Select start date"
                      className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-sm rounded-md"
                      aria-label="Select start date for filtering daily logs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="filter-end-date" className="text-sm font-medium text-gray-700">
                      End Date
                    </Label>
                    <Input
                      id="filter-end-date"
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      placeholder="Select end date"
                      className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-sm rounded-md"
                      aria-label="Select end date for filtering daily logs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="filter-project" className="text-sm font-medium text-gray-700">
                      Project
                    </Label>
                    <Select
                      value={filterProjectId}
                      onValueChange={setFilterProjectId}
                    >
                      <SelectTrigger id="filter-project" className="mt-1 text-sm rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500" aria-label="Select project">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {projects.length > 0 ? (
                          projects.map((proj) => (
                            <SelectItem key={proj.id} value={String(proj.id)}>
                              {proj.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No projects available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="filter-status-review" className="text-sm font-medium text-gray-700">
                      Status Review
                    </Label>
                    <Select
                      value={filterStatusReview}
                      onValueChange={setFilterStatusReview}
                    >
                      <SelectTrigger id="filter-status-review" className="mt-1 text-sm rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500" aria-label="Select status review">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-4 flex justify-end gap-2">
                    <Button
                      type="submit"
                      variant="default"
                      size="sm"
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors"
                      aria-label="Apply daily log filters"
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
                          Filtering...
                        </span>
                      ) : (
                        "Apply Filters"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClearFilters}
                      disabled={loading}
                      aria-label="Clear daily log filters"
                      className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      Clear
                    </Button>
                  </div>
                </form>
              </div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">All Daily Entries</h3>
                {dailyLogs.length > 0 && (
                  <span className="text-sm text-gray-600">
                    Showing {dailyLogs.length} daily log{dailyLogs.length === 1 ? "" : "s"}
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
              ) : dailyLogs.length === 0 ? (
                <div className="text-gray-500 text-center py-6 text-sm">
                  No daily entries found for this employee.
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead className="text-sm font-semibold text-gray-700 py-4">ID</TableHead>
                        <TableHead className="text-sm font-semibold text-gray-700 py-4">Date</TableHead>
                        <TableHead className="text-sm font-semibold text-gray-700 py-4">Day</TableHead>
                        <TableHead className="text-sm font-semibold text-gray-700 py-4">Project</TableHead>
                        <TableHead className="text-sm font-semibold text-gray-700 py-4">Description</TableHead>
                        <TableHead className="text-sm font-semibold text-gray-700 py-4">Total Hours</TableHead>
                        <TableHead className="text-sm font-semibold text-gray-700 py-4">Status Review</TableHead>
                        <TableHead className="text-sm font-semibold text-gray-700 py-4">Rejected Reason</TableHead>
                        <TableHead className="text-sm font-semibold text-gray-700 py-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedDailyLogs.map((log, index) => (
                        <TableRow
                          key={log.id}
                          className={`hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <TableCell className="py-4 text-gray-800 text-sm">{log.id}</TableCell>
                          <TableCell className="py-4 text-gray-800 text-sm">
                            {log.log_date
                              ? formatInTimeZone(new Date(log.log_date), "Asia/Kolkata", "MMM d, yyyy")
                              : "N/A"}
                          </TableCell>
                          <TableCell className="py-4 text-gray-800 text-sm">
                            {log.log_date
                              ? formatInTimeZone(new Date(log.log_date), "Asia/Kolkata", "eeee")
                              : "N/A"}
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                              {getProjectName(log.project_id)}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 text-gray-800 text-sm">
                            {log.task_description || log.description || "N/A"}
                          </TableCell>
                          <TableCell className="py-4 text-gray-800 text-sm">
                            {formatHours(log.total_hours)}
                          </TableCell>
                          <TableCell className="py-4 text-sm">
                            {log.status_review ? (
                              <span
                                className={`px-3 py-1 rounded-full font-medium ${
                                  log.status_review === "Approved"
                                    ? "text-green-800 bg-green-100"
                                    : log.status_review === "Rejected"
                                    ? "text-red-800 bg-red-100"
                                    : "text-yellow-800 bg-yellow-100"
                                }`}
                              >
                                {log.status_review || "Pending"}
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full text-yellow-800 bg-yellow-100 font-medium">
                                Pending
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-4 text-gray-800 text-sm">
                            {log.rejected_reason || "N/A"}
                          </TableCell>
                          <TableCell className="py-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedLogId(log.id);
                                setShowChangesDialog(true);
                              }}
                              disabled={loading}
                              aria-label={`View change history for log ${log.id}`}
                              className="text-blue-600 hover:bg-blue-50 border-blue-600 font-semibold rounded-md transition-colors"
                            >
                              View Changes
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {totalDailyLogPages > 1 && (
                    <div className="flex justify-center items-center mt-6 space-x-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDailyLogPage((prev) => Math.max(prev - 1, 1))}
                        disabled={dailyLogPage === 1}
                        aria-label="Previous page of daily logs"
                        className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600">
                        Page {dailyLogPage} of {totalDailyLogPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDailyLogPage((prev) => Math.min(prev + 1, totalDailyLogPages))}
                        disabled={dailyLogPage === totalDailyLogPages}
                        aria-label="Next page of daily logs"
                        className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
              <DailyLogChangesDialog
                open={showChangesDialog}
                onOpenChange={setShowChangesDialog}
                logId={selectedLogId}
                projects={projects}
              />
            </CardContent>
          </Card>
        </main>
      </div>
      <Footer />
    </div>
  );
}