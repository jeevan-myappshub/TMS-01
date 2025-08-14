"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import Header from "../../components/header";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";

// Define a consistent color palette for charts (accessible and theme-friendly)
const CHART_COLORS = {
  approved: "#22c55e", // Green-500 for Approved
  pending: "#eab308", // Yellow-500 for Pending
  rejected: "#ef4444", // Red-500 for Rejected
  default: "#3b82f6", // Blue-500 as fallback
};

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

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";
const CURRENT_EMAIL = process.env.NEXT_PUBLIC_EMAIL || "";

// AnalyticsTable Component
const AnalyticsTable = ({ analyticsData, projects }) => {
  const getProjectName = (pid) => {
    if (!pid) return "All Projects";
    const proj = projects.find((p) => String(p.id) === String(pid));
    return proj ? proj.name : "Unknown";
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">Metric</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-200 uppercase tracking-wider">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">Total Logs</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{analyticsData.total_logs}</td>
          </tr>
          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">Total Hours</td>
            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatFloatToTime(analyticsData.total_hours)}</td>
          </tr>
          {Object.entries(analyticsData.status_counts || {}).map(([status, count]) => (
            <tr key={status} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{status.charAt(0).toUpperCase() + status.slice(1)} Logs</td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Charts Component
const Charts = ({ analyticsData }) => {
  const statusData = Object.entries(analyticsData.status_counts || {}).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    color: CHART_COLORS[status.toLowerCase()] || CHART_COLORS.default,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Bar Chart */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Logs by Status</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={statusData}>
            <XAxis dataKey="name" stroke="currentColor" />
            <YAxis allowDecimals={false} stroke="currentColor" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
              }}
            />
            <Bar dataKey="value">
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Status Distribution</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={statusData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
              }}
            />
            <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Reports Component
export default function Reports() {
  const [employee, setEmployee] = useState(null);
  const [projects, setProjects] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({
    total_logs: 0,
    total_hours: 0,
    status_counts: {},
  });
  const [loading, setLoading] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);
  const [selectedStartDate, setSelectedStartDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const router = useRouter();

  // Set today to current date in IST
  const today = useMemo(() => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset() + 330); // IST offset
    return date;
  }, []);

  // Initialize current week dates
  const { defaultStartDate, defaultEndDate } = useMemo(() => {
    const startOfWeek = new Date(today);
    const dayOfWeek = startOfWeek.getDay();
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday as start of week
    startOfWeek.setDate(startOfWeek.getDate() - offset);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return {
      defaultStartDate: toYYYYMMDD(startOfWeek),
      defaultEndDate: toYYYYMMDD(endOfWeek),
    };
  }, [today]);

  const fetchAnalytics = useCallback(async (startDate, endDate, status, projectId) => {
    if (!employee?.id) return;
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append("start_date", startDate);
      if (endDate) queryParams.append("end_date", endDate);
      if (status) queryParams.append("status_review", status);
      if (projectId) queryParams.append("project_id", projectId);
      queryParams.append("employee_id", employee.id);

      const response = await fetch(`${BASE_URL}/api/analytics/timesheet?${queryParams.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.AUTH_TOKEN || ""}`,
        },
        cache: "no-store",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch analytics");
      }
      const data = await response.json();
      setAnalyticsData({
        total_logs: data.total_logs || 0,
        total_hours: data.total_hours || 0,
        status_counts: data.status_counts || {},
      });
    } catch (error) {
      toast.error(`Error fetching analytics: ${error.message}`, {
        className: "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200",
      });
      setAnalyticsData({ total_logs: 0, total_hours: 0, status_counts: {} });
    } finally {
      setLoading(false);
    }
  }, [employee?.id]);

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
          toast.success("Employee data loaded successfully!", {
            className: "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-200",
          });
        }
      } catch (error) {
        toast.error(`Error fetching employee data: ${error.message}`, {
          className: "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200",
        });
        setEmployee(null);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, []);

  useEffect(() => {
    if (!selectedStartDate && !selectedEndDate) {
      setSelectedStartDate(defaultStartDate);
      setSelectedEndDate(defaultEndDate);
      setTempStartDate(defaultStartDate);
      setTempEndDate(defaultEndDate);
    }
  }, [defaultStartDate, defaultEndDate, selectedStartDate, selectedEndDate]);

  useEffect(() => {
    if (employee?.id && selectedStartDate && selectedEndDate) {
      fetchAnalytics(selectedStartDate, selectedEndDate, selectedStatus, selectedProject);
    }
  }, [employee?.id, selectedStartDate, selectedEndDate, selectedStatus, selectedProject, fetchAnalytics]);

  const handleApplyFilters = useCallback(() => {
    if (tempStartDate && tempEndDate) {
      if (new Date(tempEndDate) < new Date(tempStartDate)) {
        toast.error("End date cannot be before start date", {
          className: "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200",
        });
        return;
      }
      setSelectedStartDate(tempStartDate);
      setSelectedEndDate(tempEndDate);
    } else {
      toast.error("Please select both start and end dates", {
        className: "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200",
      });
    }
  }, [tempStartDate, tempEndDate]);

  const handleClearFilters = () => {
    setTempStartDate(defaultStartDate);
    setTempEndDate(defaultEndDate);
    setSelectedStartDate(defaultStartDate);
    setSelectedEndDate(defaultEndDate);
    setSelectedStatus("");
    setSelectedProject("");
  };

  const handleBackToToday = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="flex flex-1">
        <Sidebar onBackToToday={handleBackToToday} />
        <main className="flex-1 ml-16 p-8 pt-24 overflow-y-auto">
          <ToastContainer position="top-right" autoClose={3000} theme="colored" />

          {/* Analytics Summary */}
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-gray-600 to-gray-500 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Timesheet Analytics</h2>
                <p className="mt-1 text-blue-100 text-sm">View analytics for your work logs</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <DatePicker
                    selected={tempStartDate ? new Date(tempStartDate) : null}
                    onChange={(date) => setTempStartDate(toYYYYMMDD(date))}
                    dateFormat="MM/dd/yyyy"
                    customInput={
                      <button className="appearance-none bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 font-semibold px-4 py-2 rounded-md text-sm shadow flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-600">
                        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                        {tempStartDate || "Start Date"}
                      </button>
                    }
                  />
                </div>
                <span className="text-blue-100 dark:text-blue-200 font-semibold">until</span>
                <div className="relative">
                  <DatePicker
                    selected={tempEndDate ? new Date(tempEndDate) : null}
                    onChange={(date) => setTempEndDate(toYYYYMMDD(date))}
                    dateFormat="MM/dd/yyyy"
                    customInput={
                      <button className="appearance-none bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 font-semibold px-4 py-2 rounded-md text-sm shadow flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-600">
                        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                        {tempEndDate || "End Date"}
                      </button>
                    }
                  />
                </div>
                <div className="relative">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="appearance-none bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 font-semibold px-4 py-2 rounded-md text-sm shadow focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-600"
                  >
                    <option value="">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="appearance-none bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 font-semibold px-4 py-2 rounded-md text-sm shadow focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-600"
                  >
                    <option value="">All Projects</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleApplyFilters}
                  className="bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700 font-semibold px-4 py-2 rounded-md text-sm shadow focus:outline-none focus:ring-2 focus:ring-green-300 dark:focus:ring-green-600"
                >
                  Apply
                </button>
                <button
                  onClick={handleClearFilters}
                  className="bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-700 font-semibold px-4 py-2 rounded-md text-sm shadow focus:outline-none focus:ring-2 focus:ring-red-300 dark:focus:ring-red-600"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600 dark:border-blue-300"></div>
                </div>
              ) : (
                <div className="space-y-8">
                  <AnalyticsTable analyticsData={analyticsData} projects={projects} />
                  {Object.keys(analyticsData.status_counts).length > 0 ? (
                    <Charts analyticsData={analyticsData} />
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
                      No status data available for visualization.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}