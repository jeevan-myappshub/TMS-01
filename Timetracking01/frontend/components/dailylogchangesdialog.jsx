// DailyLogChangesDialog Component

// ...existing imports...
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";

function formatStatusReview(status) {
  return status === null || status === "Pending" ? "Pending" : status;
}
import React, { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { toast } from "react-toastify";
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
        toast.error(`Error fetching changes: ${error.message}`, {
          style: { background: "#FEE2E2", color: "#EF4444" },
        });
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
                            : formatStatusReview(change.status_review) === "Approved"
                            ? "bg-green-100 text-green-800 dark:bg-green-200 dark:text-green-900"
                            : formatStatusReview(change.status_review) === "Rejected"
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

export default DailyLogChangesDialog;