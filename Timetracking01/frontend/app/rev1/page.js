"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { Search, Clock, Calendar, Briefcase, CheckCircle } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "../../components/header";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";
const LOG_PAGE_SIZE = 5;
const REVIEWER_ID = 3;

// Toast configuration
const toastConfig = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "colored",
};

// Utility functions
const formatHours = (hours) => {
  if (!hours && hours !== 0) return "0:00";
  const totalHours = Number(hours);
  if (isNaN(totalHours)) return "0:00";
  const h = Math.floor(totalHours);
  const m = Math.round((totalHours - h) * 60);
  return `${h}:${m < 10 ? "0" : ""}${m}`;
};

const formatDate = (isoDate) => {
  if (!isoDate) return "N/A";
  try {
    return formatInTimeZone(new Date(isoDate), "Asia/Kolkata", "MMM d, yyyy");
  } catch {
    return "N/A";
  }
};

const getDayOfWeek = (isoDate) => {
  if (!isoDate) return "N/A";
  try {
    return formatInTimeZone(new Date(isoDate), "Asia/Kolkata", "eeee");
  } catch {
    return "N/A";
  }
};

const capitalizeStatus = (status) => {
  if (!status) return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

const sumTotalHours = (logs) => {
  return logs.reduce((total, log) => {
    const hours = Number(log.total_hours);
    return total + (isNaN(hours) ? 0 : hours);
  }, 0);
};

// StatusIcon Component
const StatusIcon = ({ status }) => {
  const statusMap = {
    Approved: {
      color: 'bg-green-500 text-white',
      icon: (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
        </svg>
      ),
    },
    Pending: {
      color: 'bg-yellow-500 text-white',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      ),
    },
    Rejected: {
      color: 'bg-red-500 text-white',
      icon: (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
  };

  const item = statusMap[status] || {
    color: 'bg-gray-400 text-white',
    icon: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <circle cx="8" cy="8" r="8" />
      </svg>
    ),
  };

  return (
    <div className="relative group w-fit">
      <div className={`${item.color} rounded-full p-0.5`}>{item.icon}</div>
      <span className="absolute left-1/2 transform -translate-x-1/2 bottom-6 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
        {status}
      </span>
    </div>
  );
};

// ReviewLogDialog Component
function ReviewLogDialog({ open, onOpenChange, log, projects, onReviewSubmit }) {
  const [status, setStatus] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);

  const getProjectName = (pid) => {
    if (!pid || !Array.isArray(projects)) return "Unknown";
    const proj = projects.find((p) => String(p.id) === String(pid));
    return proj ? proj.name : "Unknown";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!status) {
      toast.error("Please select a status.", toastConfig);
      return;
    }
    if (status === "Rejected" && !rejectionReason.trim()) {
      toast.error("Rejection reason is required when rejecting a log.", toastConfig);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        log_id: log?.id,
        reviewer_id: REVIEWER_ID,
        status_review: status,
        rejection_reason: status === "Rejected" ? rejectionReason.trim() : "",
      };
      const res = await fetch(`${BASE_URL}/api/daily-logs/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.AUTH_TOKEN || ""}` },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update review status");
      }
      onReviewSubmit();
      onOpenChange(false);
      setStatus("");
      setRejectionReason("");
    } catch (error) {
      toast.error(error.message || "Failed to update review status", toastConfig);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      role="dialog"
      aria-labelledby="dialog-title"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md sm:max-w-lg p-6 max-h-[80vh] overflow-y-auto transform transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <h3 id="dialog-title" className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            Review Log #{log?.id || "N/A"}
          </h3>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Close dialog"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {log ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Employee:</span>
                <span className="text-sm text-gray-900 dark:text-gray-50">{log.employee_name || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-900 dark:text-gray-50">{formatDate(log.log_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-900 dark:text-gray-50">{getProjectName(log.project_id)}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Description:</span>
                <span className="text-sm text-gray-900 dark:text-gray-50">{log.task_description || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-900 dark:text-gray-50">{formatHours(log.total_hours)}</span>
              </div>
              {log.rejection_reason && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-red-600">Rejection Reason:</span>
                  <span className="text-sm text-red-600">{log.rejection_reason}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">No log data available.</div>
          )}
          <div>
            <label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-2 w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-50"
              aria-label="Select review status"
              disabled={loading}
            >
              <option value="" disabled>
                Select Status
              </option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          {status === "Rejected" && (
            <div>
              <label htmlFor="rejection-reason" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection"
                className="mt-2 w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-50"
                rows={4}
                aria-label="Enter rejection reason"
                disabled={loading}
              />
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-indigo-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Cancel review"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Submit review"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Submitting...
                </span>
              ) : (
                "Submit Review"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// FilterForm Component
function FilterForm({
  filterStartDate,
  setFilterStartDate,
  filterEndDate,
  setFilterEndDate,
  filterProjectId,
  setFilterProjectId,
  filterStatus,
  setFilterStatus,
  projects,
  loading,
  handleApplyFilters,
  handleClearFilters,
}) {
  return (
    <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
        <Search className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
        Filter Logs
      </h3>
      <form onSubmit={handleApplyFilters} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label htmlFor="filter-start-date" className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Start Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              id="filter-start-date"
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-50"
              aria-label="Select start date"
              disabled={loading}
            />
          </div>
        </div>
        <div>
          <label htmlFor="filter-end-date" className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            End Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              id="filter-end-date"
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-50"
              aria-label="Select end date"
              disabled={loading}
            />
          </div>
        </div>
        <div>
          <label htmlFor="filter-project" className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Project
          </label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              id="filter-project"
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-50 appearance-none"
              aria-label="Select project"
              disabled={loading}
            >
              <option value="all">All Projects</option>
              {Array.isArray(projects) &&
                projects.map((proj) => (
                  <option key={proj.id} value={String(proj.id)}>
                    {proj.name || "Unknown"}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="filter-status" className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Status
          </label>
          <div className="relative">
            <CheckCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-50 appearance-none"
              aria-label="Select status"
              disabled={loading}
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div className="lg:col-span-4 flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={handleClearFilters}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-indigo-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Clear all filters"
          >
            Clear Filters
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Apply filters"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Filtering...
              </span>
            ) : (
              "Apply Filters"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// LogTable Component
function LogTable({
  logs,
  currentPage,
  projects,
  loading,
  handleReviewClick,
  totalPages,
  handlePageChange,
}) {
  const paginatedLogs = useMemo(() => {
    return logs.slice((currentPage - 1) * LOG_PAGE_SIZE, currentPage * LOG_PAGE_SIZE);
  }, [logs, currentPage]);

  const totalHours = sumTotalHours(paginatedLogs);

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-400 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-800">
        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                Day
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                Project
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                Start
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                End
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                Hours
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
            {paginatedLogs.length > 0 ? (
              paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{log.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{log.employee_name || "N/A"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatDate(log.log_date)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{getDayOfWeek(log.log_date)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-200 text-indigo-800 dark:text-indigo-900">
                      {log.project_name || (Array.isArray(projects) && projects.find((p) => String(p.id) === String(log.project_id))?.name) || "Unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{log.task_description || "N/A"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{log.start_time?.slice(0, 5) || "N/A"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{log.end_time?.slice(0, 5) || "N/A"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatHours(log.total_hours)}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-row items-center gap-2">
                      {log.status ? (
                        <StatusIcon status={log.status} />
                      ) : (
                        <div className="w-4 h-4 flex-shrink-0"></div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleReviewClick(log)}
                      disabled={loading}
                      className="px-3 py-1.5 border border-indigo-300 dark:border-indigo-500 text-indigo-600 dark:text-indigo-300 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900 hover:border-indigo-500 dark:hover:border-indigo-400 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Review log ${log.id}`}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="text-gray-500 dark:text-gray-400 text-center py-6 text-sm">
                  No logs found for this page.
                </td>
              </tr>
            )}
          </tbody>
          {paginatedLogs.length > 0 && (
            <tfoot className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <td colSpan={8} className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Total Hours:
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">{formatHours(totalHours)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-4 gap-3">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-indigo-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-indigo-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}

// Main ReviewerDashboard Component
export default function ReviewerDashboard() {
  const [logs, setLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterProjectId, setFilterProjectId] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const abortControllerRef = useRef(null);

  const fetchLogs = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      abortControllerRef.current = new AbortController();
      const params = new URLSearchParams({ reviewer_id: REVIEWER_ID });
      if (filters.startDate) params.append("start_date", filters.startDate);
      if (filters.endDate) params.append("end_date", filters.endDate);
      if (filters.projectId && filters.projectId !== "all") params.append("project_id", filters.projectId);
      if (filters.status && filters.status !== "all") params.append("status_review", filters.status);

      const res = await fetch(`${BASE_URL}/api/daily-logs/by-reviewer?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.AUTH_TOKEN || ""}` },
        cache: "no-store",
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch logs");
      }
      const data = await res.json();

      const logsArr = Array.isArray(data.logs) ? data.logs : data;
      setLogs(
        logsArr.map((log) => ({
          ...log,
          status: capitalizeStatus(log.status_review),
        }))
      );

      if (Array.isArray(data.projects)) {
        setProjects(data.projects.sort((a, b) => a.id - b.id));
      } else {
        const uniqueProjects = [];
        logsArr.forEach((log) => {
          if (
            log.project_id &&
            !uniqueProjects.some((p) => String(p.id) === String(log.project_id))
          ) {
            uniqueProjects.push({
              id: log.project_id,
              name: log.project_name || "Unknown",
            });
          }
        });
        setProjects(uniqueProjects);
      }

      setCurrentPage(1);
    } catch (error) {
      if (error.name === "AbortError") return;
      toast.error(error.message || "Failed to fetch logs", toastConfig);
      setLogs([]);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchLogs]);

  const handleApplyFilters = useCallback(
    (e) => {
      e.preventDefault();
      if (filterStartDate && filterEndDate && new Date(filterStartDate) > new Date(filterEndDate)) {
        toast.error("Start date must be before or equal to end date.", toastConfig);
        return;
      }
      fetchLogs({
        startDate: filterStartDate,
        endDate: filterEndDate,
        projectId: filterProjectId,
        status: filterStatus,
      });
    },
    [filterStartDate, filterEndDate, filterProjectId, filterStatus, fetchLogs]
  );

  const handleClearFilters = useCallback(() => {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterProjectId("all");
    setFilterStatus("all");
    fetchLogs();
  }, [fetchLogs]);

  const handleReviewClick = useCallback((log) => {
    setSelectedLog(log);
    setShowReviewDialog(true);
  }, []);

  const handleReviewSubmit = useCallback(() => {
    fetchLogs({
      startDate: filterStartDate,
      endDate: filterEndDate,
      projectId: filterProjectId,
      status: filterStatus,
    });
  }, [filterStartDate, filterEndDate, filterProjectId, filterStatus, fetchLogs]);

  const handleBackToToday = useCallback(() => {
    window.location.href = "/";
  }, []);

  const totalPages = Math.ceil(logs.length / LOG_PAGE_SIZE);
  const handlePageChange = useCallback(
    (page) => {
      if (page < 1 || page > totalPages) return;
      setCurrentPage(page);
    },
    [totalPages]
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="flex flex-1">
        <Sidebar onBackToToday={handleBackToToday} />
        <main className="flex-1 ml-16 p-8 pt-24 overflow-y-auto">
          <ToastContainer {...toastConfig} />
          <div className="max-w-[1400px] mx-auto">
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-gray-600 to-gray-500 p-6">
                <h2 className="text-2xl font-bold text-white">Reviewer Dashboard</h2>
                <p className="mt-1 text-indigo-100 text-sm">Review and manage timesheet logs</p>
              </div>
              <div className="p-6">
                <FilterForm
                  filterStartDate={filterStartDate}
                  setFilterStartDate={setFilterStartDate}
                  filterEndDate={filterEndDate}
                  setFilterEndDate={setFilterEndDate}
                  filterProjectId={filterProjectId}
                  setFilterProjectId={setFilterProjectId}
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                  projects={projects}
                  loading={loading}
                  handleApplyFilters={handleApplyFilters}
                  handleClearFilters={handleClearFilters}
                />
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Logs to Review</h3>
                  {logs.length > 0 && (
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      Showing {logs.length} log{logs.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600 dark:border-indigo-300"></div>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    No logs found for review. Try adjusting your filters.
                  </div>
                ) : (
                  <>
                    <LogTable
                      logs={logs}
                      currentPage={currentPage}
                      projects={projects}
                      loading={loading}
                      handleReviewClick={handleReviewClick}
                      totalPages={totalPages}
                      handlePageChange={handlePageChange}
                    />
                    <ReviewLogDialog
                      open={showReviewDialog}
                      onOpenChange={setShowReviewDialog}
                      log={selectedLog}
                      projects={projects}
                      onReviewSubmit={handleReviewSubmit}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}