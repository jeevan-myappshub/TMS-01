"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Clock, Eye, AlertCircle, Calendar, Briefcase } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";
const CURRENT_EMAIL = "tina.46@example.com"; // TODO: Replace with auth context in production

function toYYYYMMDD(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

function getDayOfWeek(dateStr) {
  if (!isValidDate(dateStr)) return "";
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", { weekday: "long" });
}

function isValidDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function isValidTime(timeStr) {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return false;
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
}

function calculateTotalHours(start, end) {
  if (!start || !end || !isValidTime(start) || !isValidTime(end)) return "0:00";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // Handle overnight shifts
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

function sumTotalHours(logs) {
  return logs.reduce((total, log) => {
    let hours = 0;
    if (typeof log.total_hours === "string" && log.total_hours !== "0:00") {
      const [h, m] = log.total_hours.split(":").map(Number);
      hours = h + m / 60;
    } else if (typeof log.total_hours === "number" && !isNaN(log.total_hours)) {
      hours = log.total_hours;
    }
    return total + hours;
  }, 0);
}

function getTotalMinutes(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function checkTimeConflict(logs, currentLog, currentIdx) {
  if (!isValidTime(currentLog.start_time) || !isValidTime(currentLog.end_time)) return null;
  const currentStartMins = getTotalMinutes("00:00", currentLog.start_time);
  let currentEndMins = getTotalMinutes("00:00", currentLog.end_time);
  if (currentEndMins <= currentStartMins) {
    currentEndMins += 24 * 60; // Handle overnight shifts
  }

  for (let i = 0; i < logs.length; i++) {
    if (i === currentIdx) continue;
    const otherLog = logs[i];
    if (!isValidTime(otherLog.start_time) || !isValidTime(otherLog.end_time)) continue;

    let otherStartMins = getTotalMinutes("00:00", otherLog.start_time);
    let otherEndMins = getTotalMinutes("00:00", otherLog.end_time);
    if (otherEndMins <= otherStartMins) {
      otherEndMins += 24 * 60; // Handle overnight shifts
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
        toast.error(`Error fetching changes: ${error.message}`);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white border border-gray-200 shadow-2xl rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            Change History for Log #{logId}
          </DialogTitle>
        </DialogHeader>
        {changes.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200">
                <TableHead className="text-gray-900 font-semibold">Project</TableHead>
                <TableHead className="text-gray-900 font-semibold">Description</TableHead>
                <TableHead className="text-gray-900 font-semibold">Changed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((change, index) => (
                <TableRow key={change.id || index} className="hover:bg-gray-50">
                  <TableCell className="text-gray-600">{getProjectName(change.project_id)}</TableCell>
                  <TableCell className="text-gray-600">{change.new_description || "N/A"}</TableCell>
                  <TableCell className="text-gray-600">
                    {index === 0 ? "Initial Description" : new Date(change.changed_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-gray-500 text-center py-6">No changes recorded for this log.</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const TimesheetTable = ({
  day,
  logs,
  projects,
  loading,
  onViewChanges,
}) => {
  const totalDailyHours = sumTotalHours(logs);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <Table className="min-w-full">
        <TableHeader className="bg-gray-100">
          <TableRow>
            <TableHead className="text-gray-900 font-semibold py-4">Project</TableHead>
            <TableHead className="text-gray-900 font-semibold py-4">Description</TableHead>
            <TableHead className="text-gray-900 font-semibold py-4">Start Time</TableHead>
            <TableHead className="text-gray-900 font-semibold py-4">End Time</TableHead>
            <TableHead className="text-gray-900 font-semibold py-4">Total Hours</TableHead>
            <TableHead className="text-gray-900 font-semibold py-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length > 0 ? (
            logs.map((log, idx) => (
              <TableRow key={`${log.id}-${day.date}`} className={`hover:bg-gray-50 ${log.error ? "bg-red-50" : ""}`}>
                <TableCell className="text-gray-600 py-3">
                  {projects.find((p) => String(p.id) === String(log.project_id))?.name || "Unknown"}
                </TableCell>
                <TableCell className="text-gray-600 py-3">{log.description || "N/A"}</TableCell>
                <TableCell className="text-gray-600 py-3">{log.start_time || "N/A"}</TableCell>
                <TableCell className="text-gray-600 py-3">{log.end_time || "N/A"}</TableCell>
                <TableCell className={`text-gray-600 py-3 flex items-center gap-2 ${log.error ? "text-red-600" : ""}`}>
                  {typeof log.total_hours === "number" ? formatFloatToTime(log.total_hours) : log.total_hours || "0:00"}
                  {log.error && <AlertCircle className="h-4 w-4 text-red-600" title={log.error} />}
                </TableCell>
                <TableCell className="py-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewChanges(log.id)}
                    disabled={!log.id || String(log.id).startsWith("temp-")}
                    className="flex items-center gap-2 border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                    aria-label="View changes"
                  >
                    <Eye className="h-4 w-4" />
                    View Changes
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-gray-500 text-center py-6">
                No logs found for this day.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {logs.length > 0 && (
          <tfoot>
            <TableRow className="bg-gray-50">
              <TableCell colSpan={4} className="text-gray-700 font-semibold py-3 text-right">
                Total Hours for {day.date}:
              </TableCell>
              <TableCell className="text-gray-700 font-semibold py-3">
                {formatFloatToTime(totalDailyHours)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </tfoot>
        )}
      </Table>
    </div>
  );
};

export default function PreviousTimesheet() {
  const [employee, setEmployee] = useState(null);
  const [projects, setProjects] = useState([]);
  const [logsByDay, setLogsByDay] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterProjectId, setFilterProjectId] = useState("");
  const router = useRouter();

  const today = toYYYYMMDD(new Date());
  const weekDates = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = toYYYYMMDD(date);
      days.push({
        date: dateStr,
        day: getDayOfWeek(dateStr),
      });
    }
    return days;
  }, []);

  const grandTotalHours = useMemo(() => {
    return Object.values(logsByDay).reduce((total, logs) => total + sumTotalHours(logs), 0);
  }, [logsByDay]);

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
    if (employee?.id) {
      handleApplyFilters();
    }
  }, [employee?.id]);

  const handleApplyFilters = async () => {
    if (filterStartDate && filterEndDate && new Date(filterStartDate) > new Date(filterEndDate)) {
      toast.error("Start date must be before or equal to end date.");
      return;
    }

    if (!employee?.id) {
      toast.error("Employee data not loaded. Please try again.");
      return;
    }

    setLoading(true);
    try {
      let url = `${BASE_URL}/api/daily-logs/latest-seven-days/${employee.id}`;
      if (filterStartDate && filterEndDate) {
        url = `${BASE_URL}/api/daily-logs/filter/${employee.id}?start_date=${filterStartDate}&end_date=${filterEndDate}`;
        if (filterProjectId && filterProjectId !== "all") {
          url += `&project_id=${filterProjectId}`;
        }
      } else if (filterProjectId && filterProjectId !== "all") {
        url = `${BASE_URL}/api/daily-logs/filter/${employee.id}?project_id=${filterProjectId}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.AUTH_TOKEN || ""}`,
        },
        cache: "no-store",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch logs");
      }
      const logsData = await response.json();

      const logsMap = {};
      logsData.forEach((log) => {
        const logDate = log.log_date;
        if (!logsMap[logDate]) {
          logsMap[logDate] = [];
        }
        if (!logsMap[logDate].some((existingLog) => String(existingLog.id) === String(log.id))) {
          const newLog = {
            id: String(log.id),
            project_id: log.project_id?.toString() || "",
            description: log.task_description || "",
            start_time: log.start_time?.slice(0, 5) || "",
            end_time: log.end_time?.slice(0, 5) || "",
            total_hours: log.total_hours !== null ? formatFloatToTime(log.total_hours) : "0:00",
            log_date: log.log_date,
            error: null,
          };
          const timeError = checkTimeConflict(logsMap[logDate], newLog, logsMap[logDate].length);
          logsMap[logDate].push({ ...newLog, error: timeError });
        }
      });

      const filteredLogsMap = Object.fromEntries(
        Object.entries(logsMap).filter(([_, logs]) => logs.length > 0)
      );

      setLogsByDay(filteredLogsMap);
      toast.success(
        Object.keys(filteredLogsMap).length > 0
          ? "Logs loaded successfully!"
          : "No logs found for the selected filters."
      );
    } catch (error) {
      toast.error(`Error loading logs: ${error.message}`);
      setLogsByDay({});
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterProjectId("");
    setLogsByDay({});
    toast.success("Filters cleared. Showing last 7 days of logs.");
    if (employee?.id) {
      handleApplyFilters();
    }
  };

  const handleBackToToday = () => {
    router.push("/");
  };

  return (
    <div className="container mx-auto p-6 bg-gray-100 min-h-screen">
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-2">
        <Clock className="h-6 w-6 text-blue-600" />
        Previous Timesheets
      </h1>
      <Card className="w-full shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardTitle className="text-2xl font-bold">Timesheet History</CardTitle>
        </CardHeader>
        <CardContent className="p-6 bg-white">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Filter Logs
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor="start-date" className="text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="start-date"
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="pl-10 border-gray-300 focus:ring-2 focus:ring-blue-500 rounded-lg"
                    aria-label="Filter start date"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="end-date" className="text-sm font-medium text-gray-700 mb-1">
                  End Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="end-date"
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="pl-10 border-gray-300 focus:ring-2 focus:ring-blue-500 rounded-lg"
                    aria-label="Filter end date"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="project-filter" className="text-sm font-medium text-gray-700 mb-1">
                  Project
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Select
                    value={filterProjectId}
                    onValueChange={setFilterProjectId}
                  >
                    <SelectTrigger className="pl-10 border-gray-300 focus:ring-2 focus:ring-blue-500 rounded-lg">
                      <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 shadow-lg rounded-lg">
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map((proj) => (
                        <SelectItem key={proj.id} value={proj.id.toString()}>
                          {proj.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleApplyFilters}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                  aria-label="Apply filters"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="border-gray-300 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Clear filters"
              >
                Clear Filters
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleBackToToday}
                className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                aria-label="Back to today's timesheet"
              >
                Back to Today
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.keys(logsByDay).length > 0 ? (
                <>
                  {Object.entries(logsByDay)
                    .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
                    .map(([date, logs]) => (
                      <div key={date} className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-blue-600" />
                          {date} ({getDayOfWeek(date)})
                        </h3>
                        <TimesheetTable
                          day={{ date, day: getDayOfWeek(date) }}
                          logs={logs}
                          projects={projects}
                          loading={loading}
                          onViewChanges={(logId) => {
                            setSelectedLogId(logId);
                            setShowChangeDialog(true);
                          }}
                        />
                      </div>
                    ))}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      Grand Total Hours
                    </h3>
                    <p className="text-gray-700 font-semibold">
                      Total Hours for {filterStartDate && filterEndDate ? `${filterStartDate} to ${filterEndDate}` : "Last 7 Days"}: {formatFloatToTime(grandTotalHours)}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-gray-500 text-center py-8 bg-white rounded-lg shadow-sm">
                  No logs found for the selected filters. Try adjusting your filters or applying new ones.
                </div>
              )}
              <DailyLogChangesDialog
                open={showChangeDialog}
                onOpenChange={setShowChangeDialog}
                logId={selectedLogId}
                projects={projects}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
