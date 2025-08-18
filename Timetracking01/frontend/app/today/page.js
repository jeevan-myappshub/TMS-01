"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Plus,
  Trash2,
  Save,
  Eye,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "../../components/header";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";
import DateFilterDropdown from "../../components/datefilterdropdown";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";
const CURRENT_EMAIL = process.env.NEXT_PUBLIC_EMAIL || "";
const AUTH_TOKEN = process.env.NEXT_PUBLIC_AUTH_TOKEN || "";

const toastConfig = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: true,
  style: { fontSize: "14px" },
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
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
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

// Utility functions
function toYYYYMMDD(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

function getTotalMinutes(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function isValidDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function isValidTime(timeStr) {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return false;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours >= 0 && hours < 24 && (minutes === 0 || minutes === 30);
}

function calculateTotalHours(start, end) {
  if (!start || !end || !isValidTime(start) || !isValidTime(end)) return "0:00";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  if (mins === 0) return "0:00";
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

function formatFloatToTime(hours) {
  if (typeof hours !== "number" || isNaN(hours)) return "0:00";
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

function formatStatusReview(status) {
  return status === null || status === "Pending" ? "Pending" : status;
}

function getDayOfWeek(dateStr) {
  if (!isValidDate(dateStr)) return "";
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", { weekday: "long" });
}

function generateUniqueTempId(date, index) {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${date}-${index}`;
}

function checkTimeConflict(logs, currentLog, currentIdx) {
  if (!isValidTime(currentLog.start_time) || !isValidTime(currentLog.end_time)) return null;
  const currentStartMins = getTotalMinutes("00:00", currentLog.start_time);
  let currentEndMins = getTotalMinutes("00:00", currentLog.end_time);
  if (currentEndMins <= currentStartMins) {
    currentEndMins += 24 * 60;
  }

  for (let i = 0; i < logs.length; i++) {
    if (i === currentIdx) continue;
    const otherLog = logs[i];
    if (!isValidTime(otherLog.start_time) || !isValidTime(otherLog.end_time)) continue;

    let otherStartMins = getTotalMinutes("00:00", otherLog.start_time);
    let otherEndMins = getTotalMinutes("00:00", otherLog.end_time);
    if (otherEndMins <= otherStartMins) {
      otherEndMins += 24 * 60;
    }

    if (
      (currentStartMins >= otherStartMins && currentStartMins < otherEndMins) ||
      (currentEndMins > otherStartMins && currentEndMins <= otherEndMins) ||
      (currentStartMins <= otherStartMins && currentEndMins >= otherEndMins)
    ) {
      return `Time period ${currentLog.start_time}–${currentLog.end_time} overlaps with entry ${otherLog.start_time}–${otherLog.end_time}.`;
    }
  }
  return null;
}

function checkDuplicateEntry(logs, currentLog, currentIdx) {
  for (let i = 0; i < logs.length; i++) {
    if (i === currentIdx) continue;
    const otherLog = logs[i];
    if (
      otherLog.project_id === currentLog.project_id &&
      otherLog.start_time === currentLog.start_time &&
      otherLog.end_time === currentLog.end_time &&
      otherLog.description === currentLog.description
    ) {
      return `Duplicate entry detected for project, time, and description.`;
    }
  }
  return null;
}

// DailyLogChangesDialog Component
const DailyLogChangesDialog = ({ open, onOpenChange, logChanges, projects }) => {
  const getProjectName = (pid) => {
    const proj = projects.find((p) => String(p.id) === String(pid));
    return proj ? proj.name : "Unknown";
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto transform transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <h3 id="dialog-title" className="text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
            <Eye className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
            Change History
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
        {logChanges.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">Changed At</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {logChanges.map((change, index) => (
                  <tr key={change.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{getProjectName(change.project_id)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{change.new_description || "N/A"}</td>
                    <td className="px-4 py-3 text-sm">
                      <StatusIcon status={formatStatusReview(change.status_review)} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {index === 0 ? "Initial Entry" : new Date(change.changed_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">No changes recorded for this log.</div>
        )}
      </div>
    </div>
  );
};

// TimesheetTable Component
const TimesheetTable = ({
  day,
  logs,
  projects,
  loading,
  onChangeLogs,
  onAddLog,
  onRemoveLog,
  onSaveLog,
  onViewChanges,
  isEditable,
}) => {
  const timeOptions = useMemo(() => {
    const options = [];
    for (let h = 0; h < 24; h++) {
      const hourStr = h.toString().padStart(2, "0");
      options.push(`${hourStr}:00`);
      options.push(`${hourStr}:30`);
    }
    return options;
  }, []);

  const handleTimeChange = (idx, field, value) => {
    onChangeLogs((prev) => {
      const updated = [...prev];
      if (!updated[idx]) return prev;
      let start = updated[idx].start_time;
      let end = updated[idx].end_time;
      if (field === "start_time") start = value;
      if (field === "end_time") end = value;

      let timeError = null;
      if (start && end && isValidTime(start) && isValidTime(end)) {
        const startMins = getTotalMinutes("00:00", start);
        let endMins = getTotalMinutes("00:00", end);
        if (endMins <= startMins) {
          endMins += 24 * 60;
        }
        if (endMins <= startMins) {
          timeError = "End time must be after start time.";
        }
      }

      const totalHours = timeError ? "0:00" : calculateTotalHours(start, end);
      const updatedLog = { ...updated[idx], [field]: value };
      const conflictError = checkTimeConflict(updated, updatedLog, idx);
      const duplicateError = checkDuplicateEntry(updated, updatedLog, idx);
      if (conflictError) {
        toast.error(conflictError, { ...toastConfig });
      }
      if (duplicateError) {
        toast.error(duplicateError, { ...toastConfig });
      }
      updated[idx] = {
        ...updatedLog,
        total_hours: !timeError && !conflictError && isValidTime(start) && isValidTime(end) ? totalHours : "0:00",
        status_review: "Pending",
        error: timeError || conflictError || duplicateError,
        isEdited: !String(updated[idx].id).startsWith("temp-") ? true : updated[idx].isEdited,
      };

      return updated;
    });
  };

  const handleProjectChange = (idx, value) => {
    onChangeLogs((prev) => {
      const updated = [...prev];
      if (!updated[idx]) return prev;
      const updatedLog = { ...updated[idx], project_id: value, status_review: "Pending" };
      const duplicateError = checkDuplicateEntry(updated, updatedLog, idx);
      updated[idx] = { 
        ...updatedLog, 
        error: duplicateError || updated[idx].error,
        isEdited: !String(updated[idx].id).startsWith("temp-") ? true : updated[idx].isEdited 
      };
      return updated;
    });
  };

  const handleDescriptionChange = (idx, value) => {
    onChangeLogs((prev) => {
      const updated = [...prev];
      if (!updated[idx]) return prev;
      const updatedLog = { ...updated[idx], description: value, status_review: "Pending", isEdited: true };
      const duplicateError = checkDuplicateEntry(updated, updatedLog, idx);
      updated[idx] = { 
        ...updatedLog, 
        error: duplicateError || updated[idx].error,
        isEdited: !String(updated[idx].id).startsWith("temp-") ? true : updated[idx].isEdited 
      };
      return updated;
    });
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-400 shadow-sm bg-white dark:bg-gray-800">
      <table className="min-w-full divide-y divide-gray-400 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-400 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">Project</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">Description</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">Start Time</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">End Time</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">Total Hours</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {logs.length > 0 ? (
            logs.map((log, idx) => (
              <tr key={log.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${log.error ? "bg-red-50 dark:bg-red-900/50" : ""}`}>
                <td className="px-4 py-3">
                  {isEditable ? (
                    <select
                      value={log.project_id || ""}
                      onChange={(e) => handleProjectChange(idx, e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-300 focus:border-indigo-500 dark:focus:border-indigo-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                      aria-label="Select project"
                    >
                      <option value="" disabled>
                        Select Project
                      </option>
                      {projects.map((proj) => (
                        <option key={proj.id} value={proj.id.toString()}>
                          {proj.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-gray-600 dark:text-gray-300">
                      {projects.find((p) => String(p.id) === String(log.project_id))?.name || "Unknown"}
                    </span>
                  )}
                </td>
             <td className="px-4 py-3 align-top">
  {isEditable ? (
    <textarea
      className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm 
                focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-300 
                focus:border-indigo-500 dark:focus:border-indigo-300 
                bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 
                leading-relaxed resize-none overflow-y-auto"
      value={log.description || ""}
      onChange={(e) => {
        handleDescriptionChange(idx, e.target.value);

        // reset height
        e.target.style.height = "auto";

        // each line ~ 20px (depends on text-sm & leading-relaxed)
        const lineHeight = 20; 
        const maxLines = 4;
        const maxHeight = lineHeight * maxLines;

        // allow expansion but cap at 4 lines
        e.target.style.height = Math.min(e.target.scrollHeight, maxHeight) + "px";
      }}
      placeholder="Enter detailed description"
      rows={1}
      style={{ maxHeight: "80px" }} // 4 lines × 20px = 80px
      aria-label="Task description"
    />
  ) : (
    <p
      className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed 
                 max-h-20 overflow-y-auto"
      style={{ lineHeight: "20px" }} // control line height
    >
      {log.description || "N/A"}
    </p>
  )}
</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    {isEditable ? (
                      <select
                        value={log.start_time || ""}
                        onChange={(e) => handleTimeChange(idx, "start_time", e.target.value)}
                        className={`w-28 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-300 ${
                          log.error ? "border-red-500 dark:border-red-400" : ""
                        } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50`}
                        aria-label="Select start time"
                      >
                        <option value="" disabled>Select</option>
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-600 dark:text-gray-300">{log.start_time || "N/A"}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    {isEditable ? (
                      <select
                        value={log.end_time || ""}
                        onChange={(e) => handleTimeChange(idx, "end_time", e.target.value)}
                        className={`w-28 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-300 ${
                          log.error ? "border-red-500 dark:border-red-400" : ""
                        } bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50`}
                        aria-label="Select end time"
                      >
                        <option value="" disabled>Select</option>
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-600 dark:text-gray-300">{log.end_time || "N/A"}</span>
                    )}
                  </div>
                </td>
                <td className={`px-4 py-3 text-gray-600 dark:text-gray-300 ${log.error ? "text-red-600 dark:text-red-400" : ""}`}>
                  {log.total_hours || "0:00"}
                  {log.error && <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 inline ml-2" title={log.error} />}
                </td>
                <td className="px-4 py-3">
                  <StatusIcon status={formatStatusReview(log.status_review)} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    {isEditable && (
                      <>
                        <button
                          onClick={() => onSaveLog(idx)}
                          disabled={
                            loading ||
                            !log.project_id ||
                            !isValidTime(log.start_time) ||
                            !isValidTime(log.end_time) ||
                            !log.description ||
                            log.error ||
                            (!String(log.id).startsWith("temp-") && !log.isEdited)
                          }
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          aria-label={String(log.id).startsWith("temp-") ? "Save log" : "Update log"}
                        >
                          <Save className="h-4 w-4" />
                          {String(log.id).startsWith("temp-") ? "Save" : "Update"}
                        </button>
                        <button
                          onClick={() => onRemoveLog(idx)}
                          disabled={loading || !String(log.id).startsWith("temp-")}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 dark:hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          aria-label="Remove log"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => onViewChanges(log.changes)}
                      disabled={!log.changes || log.changes.length === 0 || loading}
                      className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      aria-label="View changes"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="text-gray-500 dark:text-gray-400 text-center py-6 text-sm">
                No logs found for this day.
              </td>
            </tr>
          )}
          {isEditable && (
            <tr>
              <td colSpan={7} className="text-center py-6">
                <button
                  onClick={onAddLog}
                  disabled={loading}
                  className="flex items-center gap-2 mx-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  aria-label="Add new log entry"
                >
                  <Plus className="h-4 w-4" />
                  Add Entry
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// TodayTimesheet Component
// TodayTimesheet Component
export default function TodayTimesheet() {
  const [employee, setEmployee] = useState(null);
  const [projects, setProjects] = useState([]);
  const [logsByDay, setLogsByDay] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedLogChanges, setSelectedLogChanges] = useState([]);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const router = useRouter();

  // Initialize default week dates for week view navigation
  const today = useMemo(() => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset() + 330);
    return toYYYYMMDD(date);
  }, []);

  const { defaultWeekStart, defaultWeekEnd } = useMemo(() => {
    const startOfWeek = new Date(today);
    const dayOfWeek = startOfWeek.getDay();
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(startOfWeek.getDate() - offset);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return {
      defaultWeekStart: toYYYYMMDD(startOfWeek),
      defaultWeekEnd: toYYYYMMDD(endOfWeek),
    };
  }, [today]);

  const todayDateObj = useMemo(() => ({
    date: currentDate || today,
    day: currentDate ? getDayOfWeek(currentDate) : getDayOfWeek(today),
  }), [currentDate, today]);

  const createSetLogsForDay = useCallback(
    (date) => (fn) =>
      setLogsByDay((prev) => ({
        ...prev,
        [date]: fn(prev[date] || []),
      })),
    []
  );

  useEffect(() => {
    const fetchEmployeeData = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${BASE_URL}/api/employee-info?email=${encodeURIComponent(CURRENT_EMAIL)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${AUTH_TOKEN}`,
            },
            cache: "no-store",
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch employee data");
        }
        const data = await response.json();
        setEmployee(data.employee || null);
        setProjects(data.projects || []);
      } catch (error) {
        toast.error(`Error fetching employee data: ${error.message}`, {
          ...toastConfig,
        });
        setEmployee(null);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, []);

  const fetchTodayLogs = useCallback(async () => {
    if (!employee?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/daily-logs/today/${employee.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AUTH_TOKEN}`,
        },
        cache: "no-store",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch today's logs");
      }
      const logs = await response.json();
      const newLogsByDay = {};
      const logDate = logs.length > 0 ? logs[0].log_date : today;
      setCurrentDate(logDate);
      const dayLogs = logs.map((log, idx) => {
        const newLog = {
          id: String(log.id || generateUniqueTempId(logDate, idx)),
          project_id: log.project_id?.toString() || "",
          description: log.task_description || "",
          start_time: log.start_time || "",
          end_time: log.end_time || "",
          total_hours: log.total_hours !== null ? formatFloatToTime(log.total_hours) : "0:00",
          log_date: log.log_date || today,
          status_review: formatStatusReview(log.status_review),
          changes: log.changes || [],
          error: null,
          isEdited: false,
        };
        const timeError = checkTimeConflict(logs, newLog, idx);
        const duplicateError = checkDuplicateEntry(logs, newLog, idx);
        return { ...newLog, error: timeError || duplicateError };
      });
      newLogsByDay[logDate] = dayLogs;
      setLogsByDay(newLogsByDay);
      if (dayLogs.some((log) => log.error)) {
        toast.error("Some log entries have time conflicts or duplicates.", {
          ...toastConfig,
        });
      } else if (logs.length > 0) {
        toast.success("Today's logs loaded successfully!", {
          ...toastConfig,
        });
      }
    } catch (error) {
      toast.error(`Error fetching today's logs: ${error.message}`, {
        ...toastConfig,
      });
      setLogsByDay({ [today]: [] });
    } finally {
      setLoading(false);
    }
  }, [employee?.id, today]);

  useEffect(() => {
    if (employee?.id) {
      fetchTodayLogs();
    }
  }, [employee?.id, fetchTodayLogs]);

  const handleSaveLog = async (date, idx) => {
    if (!isValidDate(date)) {
      toast.error("Invalid date for saving logs.", {
        ...toastConfig,
      });
      return;
    }
    const logsForDay = logsByDay[date] || [];
    const log = logsForDay[idx];
    if (!log) {
      toast.error("Log entry not found.", {
        ...toastConfig,
      });
      return;
    }

    if (
      !log.project_id ||
      !isValidTime(log.start_time) ||
      !isValidTime(log.end_time) ||
      !log.description ||
      log.error
    ) {
      toast.error("Please fill all required fields and resolve time conflicts or duplicates.", {
        ...toastConfig,
      });
      return;
    }

    const totalMinutes = getTotalMinutes(log.start_time, log.end_time);
    if (totalMinutes <= 0) {
      toast.error("End time must be after start time.", {
        ...toastConfig,
      });
      return;
    }

    const totalHoursFloat = totalMinutes / 60;
const payload = [
  {
    id: String(log.id).startsWith("temp-") ? null : parseInt(log.id, 10),
    employee_id: employee.id,
    log_date: date,
    project_id: parseInt(log.project_id, 10),
    start_time: log.start_time,
    end_time: log.end_time,
    total_hours: totalHoursFloat,
    task_description: log.description,
    status_review: "pending",
    reviewer_id: employee.reviewer_id || null, // Ensure this is included
  },
];

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/daily-logs/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AUTH_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save daily log");
      }
      const savedLog = await res.json();
      const savedLogId = savedLog[0]?.id || `saved-${Date.now()}-${idx}`;
      setLogsByDay((prev) => {
        const updatedLogs = [...(prev[date] || [])];
        updatedLogs[idx] = {
          ...updatedLogs[idx],
          id: savedLogId,
          status_review: "Pending",
          error: null,
          changes: savedLog[0]?.changes || [], // Ensure changes are updated from response
          isEdited: false,
        };
        return { ...prev, [date]: updatedLogs };
      });
      toast.success("Log saved successfully!", {
        ...toastConfig,
      });
      await fetchTodayLogs();
    } catch (error) {
      toast.error(`Error saving log: ${error.message}`, {
        ...toastConfig,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddLogRow = (date) => {
    if (!isValidDate(date)) {
      toast.error("Invalid date for adding logs.", {
        ...toastConfig,
      });
      return;
    }
    setLogsByDay((prev) => {
      const newLogs = [
        ...(prev[date] || []),
        {
          id: generateUniqueTempId(date, prev[date]?.length || 0),
          project_id: "",
          description: "",
          start_time: "",
          end_time: "",
          total_hours: "0:00",
          log_date: date,
          status_review: "Pending",
          changes: [],
          error: null,
          isEdited: false,
        },
      ];
      const duplicateError = checkDuplicateEntry(newLogs, newLogs[newLogs.length - 1], newLogs.length - 1);
      if (duplicateError) {
        toast.error(duplicateError, { ...toastConfig });
        return prev;
      }
      toast.success("New log entry added!", {
        ...toastConfig,
      });
      return { ...prev, [date]: newLogs };
    });
  };

  const handleRemoveLogRow = (date, idx) => {
    if (!isValidDate(date)) {
      toast.error("Invalid date for removing logs.", {
        ...toastConfig,
      });
      return;
    }
    const logsForDay = logsByDay[date] || [];
    const log = logsForDay[idx];
    if (!log) {
      toast.error("Log entry not found.", {
        ...toastConfig,
      });
      return;
    }
    if (!String(log.id).startsWith("temp-")) {
      toast.error("Saved logs cannot be removed.", {
        ...toastConfig,
      });
      return;
    }

    setLogsByDay((prev) => ({
      ...prev,
      [date]: logsForDay.filter((_, i) => i !== idx),
    }));
    toast.success("Log removed successfully!", {
      ...toastConfig,
    });
  };

  const handleBack = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleWeekViewSelect = useCallback(() => {
    router.push("/"); // Replace with actual week view route if different
  }, [router]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="flex flex-1">
        <Sidebar onBackToToday={handleBack} />
        <main className="flex-1 ml-16 p-8 pt-24 overflow-y-auto">
          <ToastContainer {...toastConfig} />
          <div className="max-w-[1400px] mx-auto">
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-gray-600 to-gray-500 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Today's Timesheet</h2>
                  <p className="mt-1 text-indigo-100 text-sm">Manage your daily work logs</p>
                </div>
                <DateFilterDropdown
                  router={router}
                  onWeekViewSelect={handleWeekViewSelect}
                />
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600 dark:border-indigo-300"></div>
                  </div>
                ) : employee ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-3 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                        {todayDateObj.date} ({todayDateObj.day})
                      </h4>
                      <TimesheetTable
                        day={todayDateObj}
                        logs={logsByDay[todayDateObj.date] || []}
                        projects={projects}
                        loading={loading}
                        onChangeLogs={createSetLogsForDay(todayDateObj.date)}
                        onAddLog={() => handleAddLogRow(todayDateObj.date)}
                        onRemoveLog={(idx) => handleRemoveLogRow(todayDateObj.date, idx)}
                        onSaveLog={(idx) => handleSaveLog(todayDateObj.date, idx)}
                        onViewChanges={(changes) => {
                          setSelectedLogChanges(changes);
                          setShowChangeDialog(true);
                        }}
                        isEditable={true}
                      />
                    </div>
                    {Object.keys(logsByDay).length === 0 || !logsByDay[todayDateObj.date]?.length ? (
                      <div className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        No logs found for today. Add a new entry to start tracking.
                      </div>
                    ) : null}
                    <DailyLogChangesDialog
                      open={showChangeDialog}
                      onOpenChange={setShowChangeDialog}
                      logChanges={selectedLogChanges}
                      projects={projects}
                    />
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    Unable to load employee data. Please try again.
                  </div>
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