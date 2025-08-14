"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Eye } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Header from "../components/header";
import Sidebar from "../components/sidebar";
import Footer from "../components/footer";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";
// const CURRENT_EMAIL = "tina.46@example.com";
const CURRENT_EMAIL = process.env.NEXT_PUBLIC_EMAIL || "";

// Utility functions
function toYYYYMMDD(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
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
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", { weekday: "long" });
}

// DailyLogChangesDialog Component
const DailyLogChangesDialog = ({ open, onOpenChange, logId, projects }) => {
  const [changes, setChanges] = useState([]);

  useEffect(() => {
    const fetchChanges = async () => {
      if (!logId || String(logId).startsWith("temp-")) {
        setChanges([]);
        return;
      }
      try {
        const response = await fetch(`${BASE_URL}/api/daily-logs/${logId}/changes`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.AUTH_TOKEN || ""}`,
          },
          cache: "no-store",
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch changes");
        }
        const data = await response.json();
        setChanges(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error(`Error fetching changes: ${error.message}`, 
        );
        setChanges([]);
      }
    };

    if (open && logId) {
      fetchChanges();
    }
  }, [open, logId]);

  const getProjectName = (pid) => {
    const proj = projects.find((p) => String(p.id) === String(pid));
    return proj ? proj.name : "Unknown";
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300 ${
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
            Change History for Log #{logId}
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
        {changes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">Changed At</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {changes.map((change, index) => (
                  <tr key={change.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{getProjectName(change.project_id)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{change.new_description || "N/A"}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          formatStatusReview(change.status_review) === "Pending"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-200 dark:text-yellow-900"
                            : formatStatusReview(change.status_review) === "approved" || change.status_review === "approved"
                            ? "bg-green-100 text-green-800 dark:bg-green-200 dark:text-green-900"
                            : formatStatusReview(change.status_review) === "rejected" || change.status_review === "rejected"
                            ? "bg-red-100 text-red-800 dark:bg-red-200 dark:text-red-900"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200"
                        }`}
                      >
                        {formatStatusReview(change.status_review)}
                      </span>
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

const WeeklyTimesheetTable = ({ weekDates, logsByDay, projects }) => {
  // Filter projects to only those with logs in logsByDay
  const activeProjectIds = useMemo(() => {
    const projectIds = new Set();
    weekDates.forEach((day) => {
      const logs = logsByDay[day.date] || [];
      logs.forEach((log) => {
        if (log.project_id) {
          projectIds.add(String(log.project_id));
        }
      });
    });
    return Array.from(projectIds);
  }, [weekDates, logsByDay]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => activeProjectIds.includes(String(project.id)));
  }, [projects, activeProjectIds]);

  const getProjectHours = (projectId, date) => {
    const logs = logsByDay[date] || [];
    const totalMinutes = logs
      .filter((log) => String(log.project_id) === String(projectId))
      .reduce((sum, log) => {
        if (log.total_hours) {
          const [hours, minutes] = log.total_hours.split(":").map(Number);
          return sum + hours * 60 + minutes;
        }
        return sum;
      }, 0);
    return formatFloatToTime(totalMinutes / 60);
  };

  const getProjectTotalHours = (projectId) => {
    const totalMinutes = weekDates.reduce((sum, day) => {
      const logs = logsByDay[day.date] || [];
      return (
        sum +
        logs
          .filter((log) => String(log.project_id) === String(projectId))
          .reduce((daySum, log) => {
            if (log.total_hours) {
              const [hours, minutes] = log.total_hours.split(":").map(Number);
              return daySum + hours * 60 + minutes;
            }
            return daySum;
          }, 0)
      );
    }, 0);
    return formatFloatToTime(totalMinutes / 60);
  };

  const getDayTotalHours = (date) => {
    const logs = logsByDay[date] || [];
    const totalMinutes = logs.reduce((sum, log) => {
      if (log.total_hours) {
        const [hours, minutes] = log.total_hours.split(":").map(Number);
        return sum + hours * 60 + minutes;
      }
      return sum;
    }, 0);
    return formatFloatToTime(totalMinutes / 60);
  };

  const getProjectStatus = (projectId, date) => {
    const logs = logsByDay[date] || [];
    const log = logs.find((log) => String(log.project_id) === String(projectId));
    return log ? formatStatusReview(log.status_review) : "";
  };

  // Format date as "Mon" and "08/04/25" for separate lines
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.toLocaleString('en-US', { weekday: 'short' });
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayNum = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return { day, date: `${month}/${dayNum}/${year}` };
  };

  // SVG icons for status with tooltip
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

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-400 shadow-sm bg-white dark:bg-gray-800">
      <table className="min-w-full divide-y divide-gray-400 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">Project</th>
            {weekDates.map((dateObj) => {
              const { day, date } = formatDate(dateObj.date);
              return (
                <th key={dateObj.date} className="px-4 py-3 text-center text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">
                  <div className="flex flex-col items-center">
                    <span>{day}</span>
                    <span>{date}</span>
                  </div>
                </th>
              );
            })}
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-900 dark:text-gray-200 uppercase tracking-wider">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{project.name}</td>
                {weekDates.map((day) => (
                  <td key={day.date} className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex flex-row items-center justify-center gap-2">
                      {getProjectStatus(project.id, day.date) ? (
                        <StatusIcon status={getProjectStatus(project.id, day.date)} />
                      ) : (
                        <div className="w-4 h-4 flex-shrink-0"></div>
                      )}
                      <span>{getProjectHours(project.id, day.date)}</span>
                    </div>
                  </td>
                ))}
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 font-semibold text-right">
                  {getProjectTotalHours(project.id)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={weekDates.length + 2} className="text-gray-500 dark:text-gray-400 text-center py-6 text-sm">
                No projects with logs found for this week.
              </td>
            </tr>
          )}
          <tr className="bg-gray-100 dark:bg-gray-700 font-semibold">
            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">Total</td>
            {weekDates.map((day) => (
              <td key={day.date} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 text-center">
                {getDayTotalHours(day.date)}
              </td>
            ))}
            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 text-right">
              {formatFloatToTime(
                weekDates.reduce((sum, day) => {
                  const logs = logsByDay[day.date] || [];
                  return (
                    sum +
                    logs.reduce((daySum, log) => {
                      if (log.total_hours) {
                        const [hours, minutes] = log.total_hours.split(":").map(Number);
                        return daySum + hours * 60 + minutes;
                      }
                      return daySum;
                    }, 0)
                  );
                }, 0) / 60
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// Home Component
export default function Home() {
  const [employee, setEmployee] = useState(null);
  const [projects, setProjects] = useState([]);
  const [logsByDay, setLogsByDay] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState(null);
  const [selectedWeekEnd, setSelectedWeekEnd] = useState(null);
  const [tempWeekStart, setTempWeekStart] = useState(null);
  const [tempWeekEnd, setTempWeekEnd] = useState(null);
  const router = useRouter();

  // Set today to current date in IST
  const today = useMemo(() => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset() + 330); // IST offset
    return date;
  }, []);

  // Initialize current week dates
  const { defaultWeekStart, defaultWeekEnd } = useMemo(() => {
    const startOfWeek = new Date(today);
    const dayOfWeek = startOfWeek.getDay();
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday as start of week
    startOfWeek.setDate(startOfWeek.getDate() - offset);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return {
      defaultWeekStart: toYYYYMMDD(startOfWeek),
      defaultWeekEnd: toYYYYMMDD(endOfWeek),
    };
  }, [today]);

  // Calculate weekDates based on selectedWeekStart and selectedWeekEnd
  const weekDates = useMemo(() => {
    const days = [];
    const start = selectedWeekStart ? new Date(selectedWeekStart) : new Date(defaultWeekStart);
    const end = selectedWeekEnd ? new Date(selectedWeekEnd) : new Date(defaultWeekEnd);
    const current = new Date(start);
    while (current <= end) {
      const dateStr = toYYYYMMDD(current);
      days.push({
        date: dateStr,
        day: getDayOfWeek(dateStr),
      });
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [selectedWeekStart, selectedWeekEnd, defaultWeekStart, defaultWeekEnd]);

  const fetchWeeklyLogs = useCallback(async (startDate, endDate) => {
    if (!employee?.id) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/api/daily-logs/week/${employee.id}?start_date=${startDate}&end_date=${endDate}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.AUTH_TOKEN || ""}`,
          },
          cache: "no-store",
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch weekly logs");
      }
      const logs = await response.json();
      const newLogsByDay = {};
      weekDates.forEach((day) => {
        const dayLogs = logs
          .filter((log) => log.log_date >= startDate && log.log_date <= endDate)
          .filter((log) => log.log_date === day.date)
          .map((log, idx) => ({
            id: String(log.id || `temp-${day.date}-${idx}`),
            project_id: log.project_id?.toString() || "",
            description: log.task_description || "",
            start_time: log.start_time?.slice(0, 5) || "",
            end_time: log.end_time?.slice(0, 5) || "",
            total_hours: log.total_hours !== null ? formatFloatToTime(log.total_hours) : "0:00",
            log_date: log.log_date || day.date,
            status_review: formatStatusReview(log.status_review),
            error: null,
          }));
        newLogsByDay[day.date] = dayLogs;
      });
      setLogsByDay(newLogsByDay);
    } catch (error) {
      toast.error(`Error fetching weekly logs: ${error.message}`, 
      );
      setLogsByDay({});
    } finally {
      setLoading(false);
    }
  }, [employee?.id, weekDates]);

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
              "Authorization": `Bearer ${process.env.AUTH_TOKEN || ""}`,
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
        if (data.projects && data.projects.length > 0) {
          toast.success("Employee data loaded successfully!");
        }
      } catch (error) {
        toast.error(`Error fetching employee data: ${error.message}`);
        setEmployee(null);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, []);

  useEffect(() => {
    // Fetch logs for the current week after employee data is loaded
    if (employee?.id && selectedWeekStart && selectedWeekEnd) {
      fetchWeeklyLogs(selectedWeekStart, selectedWeekEnd);
    }
  }, [employee?.id, selectedWeekStart, selectedWeekEnd, fetchWeeklyLogs]);

  useEffect(() => {
    // Set default week only on initial load
    if (!selectedWeekStart && !selectedWeekEnd) {
      setSelectedWeekStart(defaultWeekStart);
      setSelectedWeekEnd(defaultWeekEnd);
      setTempWeekStart(defaultWeekStart);
      setTempWeekEnd(defaultWeekEnd);
    }
  }, [defaultWeekStart, defaultWeekEnd, selectedWeekStart, selectedWeekEnd]);

  const handleApplyFilters = useCallback(() => {
    if (tempWeekStart && tempWeekEnd) {
      if (new Date(tempWeekEnd) < new Date(tempWeekStart)) {
        toast.error("End date cannot be before start date", {
          style: { background: "#FEE2E2", color: "#EF4444" },
        });
        return;
      }
      setSelectedWeekStart(tempWeekStart);
      setSelectedWeekEnd(tempWeekEnd);
    } else {
      toast.error("Please select both start and end dates", 
      );
    }
  }, [tempWeekStart, tempWeekEnd]);

  const handleViewTodayTimesheet = useCallback(() => {
    router.push("/today");
  }, [router]);

  const handleBackToToday = useCallback(() => {
    window.location.href = "/";
  }, []);

  const handleClearDates = () => {
    setTempWeekStart(defaultWeekStart);
    setTempWeekEnd(defaultWeekEnd);
    setSelectedWeekStart(defaultWeekStart);
    setSelectedWeekEnd(defaultWeekEnd);
    fetchWeeklyLogs(defaultWeekStart, defaultWeekEnd);
  };

return (
  <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
    <Header />
    <div className="flex flex-1">
      <Sidebar onBackToToday={handleBackToToday} />
      <main className="flex-1 ml-16 p-8 pt-24 overflow-y-auto">
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />

        {/* Date Filters Section (Moved Here) */}
                <div className="w-full flex items-start justify-end">
  <div className="dark:bg-gray-800 shadow-md rounded-lg  mb-4 flex items-center gap-2">
    <div className="relative">
      <DatePicker
        selected={tempWeekStart ? new Date(tempWeekStart) : null}
        onChange={(date) => setTempWeekStart(toYYYYMMDD(date))}
        dateFormat="MM/dd/yyyy"
        customInput={
          <button className="appearance-none bg-transparent dark:bg-gray-700 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-gray-600 font-semibold px-4 py-2 rounded-md text-sm shadow flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <Calendar className="h-4 w-4 text-indigo-600" />
            {tempWeekStart || "Week from"}
          </button>
        }
      />
    </div>

    <span className="text-gray-600 dark:text-gray-300 font-semibold">To</span>

    <div className="relative">
      <DatePicker
        selected={tempWeekEnd ? new Date(tempWeekEnd) : null}
        onChange={(date) => setTempWeekEnd(toYYYYMMDD(date))}
        dateFormat="MM/dd/yyyy"
        customInput={
          <button className="appearance-none bg-transparent dark:bg-gray-700 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-gray-600 font-semibold px-4 py-2 rounded-md text-sm shadow flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <Calendar className="h-4 w-4 text-indigo-600" />
            {tempWeekEnd || "until"}
          </button>
        }
      />
    </div>

    <button
      onClick={handleApplyFilters}
      className="bg-green-600 text-white hover:bg-green-700 font-semibold px-2 py-1 rounded-md text-sm shadow focus:outline-none focus:ring-2 focus:ring-green-300"
    >
      Apply
    </button>
    <button
      onClick={handleClearDates}
      className="bg-red-600 text-white px-2 py-1 rounded-md hover:bg-red-700 focus:outline-none text-sm shadow focus:ring-2 focus:ring-red-300"
    >
      Clear
    </button>
  </div>
</div>

        {/* Timesheet Summary */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-gray-600 to-gray-500 p-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Weekly Timesheet Overview</h2>
              <p className="mt-1 text-white text-sm">View your weekly work log summary</p>
            </div>
            <button
              onClick={handleViewTodayTimesheet}
              className="bg-white text-indigo-600 hover:bg-indigo-100 font-semibold px-2 py-2 rounded-md text-sm shadow"
            >
              📅 View Today's Timesheet
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600 dark:border-indigo-300"></div>
              </div>
            ) : (
              <WeeklyTimesheetTable
                weekDates={weekDates}
                logsByDay={logsByDay}
                projects={projects}
              />
            )}
          </div>
        </div>

        {/* Log change dialog */}
        <DailyLogChangesDialog
          open={showChangeDialog}
          onOpenChange={setShowChangeDialog}
          logId={selectedLogId}
          projects={projects}
        />
      </main>
    </div>
    <Footer />
  </div>
);
}