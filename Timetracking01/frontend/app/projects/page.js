"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Search, Trash2 } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "../../components/header";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";
const CURRENT_EMAIL = process.env.NEXT_PUBLIC_EMAIL || " "; // TODO: Replace with auth context

/* ---------------------------- Assignment Modal ---------------------------- */
const AssignmentModal = ({ isOpen, onClose, onSubmit, title }) => {
  const [employeeIds, setEmployeeIds] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddId = () => {
    const id = parseInt(inputValue);
    if (!inputValue || isNaN(id) || id <= 0) {
      setError("Please enter a valid positive Employee ID");
      return;
    }
    if (!employeeIds.includes(inputValue)) {
      setEmployeeIds([...employeeIds, inputValue]);
      setInputValue("");
      setError("");
    } else {
      setError("This Employee ID is already added");
    }
  };

  const handleRemoveId = (id) => {
    setEmployeeIds(employeeIds.filter((eid) => eid !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (employeeIds.length === 0) {
      setError("Please add at least one Employee ID");
      return;
    }
    setLoading(true);
    let hasError = false;
    for (const eid of employeeIds) {
      try {
        await onSubmit(parseInt(eid));
      } catch (error) {
        hasError = true; // Track if any assignment fails
        toast.error(error.message); // Display specific error for each employee
      }
    }
    setLoading(false);
    if (!hasError) {
      setEmployeeIds([]);
      setInputValue("");
      setError("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 transition-all">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full mx-4 animate-fadeIn"
      >
        <h3 className="flex items-center gap-2 text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          <Plus className="h-6 w-6 text-indigo-600" /> {title}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Employee IDs (add one at a time)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setError("");
                }}
                className={`w-full px-4 py-3 rounded-lg border focus:ring-2 ${
                  error
                    ? "border-red-500 focus:ring-red-400"
                    : "border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
                } dark:bg-gray-700 dark:text-gray-200 transition`}
                placeholder="Enter Employee ID"
              />
              <button
                type="button"
                onClick={handleAddId}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Add
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            <div className="mt-4">
              {employeeIds.length > 0 ? (
                <ul className="space-y-2">
                  {employeeIds.map((id) => (
                    <li key={id} className="flex items-center justify-between bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg">
                      <span>{id}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveId(id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No Employee IDs added yet.</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-2 ${
                loading ? "opacity-75 cursor-not-allowed" : ""
              }`}
            >
              {loading ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full"></span>
                  Assigning...
                </>
              ) : (
                "Assign Employees"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ----------------------------- Removal Modal ------------------------------ */
const RemovalModal = ({ isOpen, onClose, onConfirm, employeeName, projectName }) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full mx-4 animate-fadeIn"
      >
        <h3 className="flex items-center gap-2 text-2xl font-bold mb-6 text-red-600">
          <Trash2 className="h-6 w-6" /> Confirm Removal
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Are you sure you want to remove{" "}
          <span className="font-semibold">{employeeName}</span> from{" "}
          <span className="font-semibold">{projectName}</span>?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`px-5 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition flex items-center gap-2 ${
              loading ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            {loading ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full"></span>
                Removing...
              </>
            ) : (
              "Remove Employee"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ProjectAssignmentsTable Component
const ProjectAssignmentsTable = ({ projects, assignments, adminAssignments, managerId, onAssign, onRemove }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isRemovalModalOpen, setIsRemovalModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");

  const handleApplyFilter = () => {
    setSearchTerm(pendingSearchTerm);
  };

  const handleClearFilter = () => {
    setPendingSearchTerm("");
    setSearchTerm("");
  };

  const handleAssignEmployee = async (employeeId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/manager_project/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manager_id: managerId,
          project_id: selectedProjectId,
          employee_id: employeeId,
        }),
      });

      const responseData = await response.json();
      if (!response.ok) {
        let errorMessage = responseData.detail || "Failed to assign employee";
        if (response.status === 400) {
          errorMessage = responseData.detail || "Invalid or missing data";
        } else if (response.status === 403) {
          errorMessage = responseData.detail || "You are not authorized to assign employees to this project";
        } else if (response.status === 404) {
          errorMessage = responseData.detail || "Project not found";
        } else if (response.status === 409) {
          errorMessage = responseData.detail || "Employee already assigned to this project";
        } else if (response.status === 500) {
          errorMessage = responseData.detail || "Server error while assigning employee";
        }
        throw new Error(errorMessage);
      }

      toast.success(responseData.message || `Employee ${employeeId} assigned successfully!`);
      onAssign();
    } catch (error) {
      throw new Error(error.message); // Rethrow to be caught in AssignmentModal
    }
  };

  const handleRemoveEmployee = async (assignment) => {
    try {
      const response = await fetch(`${BASE_URL}/api/manager_project/remove`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manager_id: managerId,
          project_id: assignment.project_id,
          employee_id: assignment.employee_id,
        }),
      });

      const responseData = await response.json();
      if (!response.ok) {
        let errorMessage = responseData.detail || "Failed to remove employee";
        if (response.status === 400) {
          errorMessage = responseData.detail || "Invalid or missing data";
        } else if (response.status === 403) {
          errorMessage = responseData.detail || "You are not authorized to remove employees from this project";
        } else if (response.status === 404) {
          errorMessage = responseData.detail || "Project or employee not found";
        } else if (response.status === 500) {
          errorMessage = responseData.detail || "Server error while removing employee";
        }
        throw new Error(errorMessage);
      }

      toast.success(responseData.message || "Employee removed successfully!");
      onRemove();
    } catch (error) {
      toast.error(`Error removing employee: ${error.message}`);
    }
  };

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search projects..."
            value={pendingSearchTerm}
            onChange={(e) => setPendingSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        <button
          onClick={handleApplyFilter}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
        >
          Apply
        </button>
        <button
          onClick={handleClearFilter}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
        >
          Clear
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Project Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Assigned Employees</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => {
                const managerAssignments = assignments.filter(
                  (a) => a.project_id === project.id && a.employee_id !== null
                );
                const adminAssignmentsForProject = adminAssignments.filter(
                  (a) => a.project_id === project.id
                );
                const allAssignments = [
                  ...managerAssignments.map((a) => ({
                    employee_id: a.employee_id,
                    employee_name: a.employee_name,
                    project_id: a.project_id,
                    project_name: a.project_name,
                    source: "Team Member",
                  })),
                  ...adminAssignmentsForProject.map((a) => ({
                    employee_id: a.employee_id,
                    employee_name: a.employee_name,
                    project_id: a.project_id,
                    project_name: project.name,
                    source: "Manager",
                  })),
                ].reduce((acc, curr) => {
                  if (!acc.find((a) => a.employee_id === curr.employee_id)) {
                    acc.push(curr);
                  }
                  return acc;
                }, []);

                return (
                  <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-gray-200">{project.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {allAssignments.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {allAssignments.map((a) => (
                            <div
                              key={a.employee_id}
                              className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded-full px-3 py-1 text-sm transition-all duration-200 hover:shadow-md"
                            >
                              <span className="font-medium text-gray-800 dark:text-gray-200">
                                {a.employee_name || "N/A"}
                              </span>
                              {a.source === "Manager" ? (
                                <span className="text-xs text-indigo-400 font-semibold">(Manager)</span>
                              ) : (
                                <span className="text-xs text-gray-400 font-semibold">(Team Member)</span>
                              )}
                              {a.source === "Team Member" && a.employee_id && (
                                <button
                                  onClick={() => {
                                    setSelectedAssignment(a);
                                    setIsRemovalModalOpen(true);
                                  }}
                                  className="ml-2 p-1 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-full transition-all duration-200"
                                  aria-label={`Remove ${a.employee_name}`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">No employees assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      <button
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          setIsModalOpen(true);
                        }}
                        className="bg-indigo-600 text-white hover:bg-indigo-700 font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                      >
                        <Plus size={16} /> Assign Employee
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={3} className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">
                  No projects assigned to you.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <AssignmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAssignEmployee}
        title="Assign Employee to Project"
      />
      <RemovalModal
        isOpen={isRemovalModalOpen}
        onClose={() => setIsRemovalModalOpen(false)}
        onConfirm={() => handleRemoveEmployee(selectedAssignment)}
        employeeName={selectedAssignment?.employee_name}
        projectName={selectedAssignment?.project_name}
      />
    </div>
  );
};

// Projects Component
export default function Projects() {
  const [manager, setManager] = useState(null);
  const [projects, setProjects] = useState([]);
  const [managerAssignments, setManagerAssignments] = useState([]);
  const [adminAssignments, setAdminAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProjectsAndAssignments = useCallback(async () => {
    if (!manager?.id) return;
    setLoading(true);
    try {
      const projectsResponse = await fetch(`${BASE_URL}/api/employee_projects/${manager.id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!projectsResponse.ok) {
        const errorData = await projectsResponse.json();
        throw new Error(errorData.error || "Failed to fetch projects");
      }
      const projectsData = await projectsResponse.json();

      const managerAssignmentsResponse = await fetch(`${BASE_URL}/api/manager_projects/${manager.id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!managerAssignmentsResponse.ok) {
        const errorData = await managerAssignmentsResponse.json();
        throw new Error(errorData.error || "Failed to fetch manager assignments");
      }
      const managerAssignmentsData = await managerAssignmentsResponse.json();

      const adminAssignmentsPromises = projectsData.map(async (project) => {
        try {
          const response = await fetch(`${BASE_URL}/api/project_employees/${project.id}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          });
          if (!response.ok) {
            const errorData = await response.json();
            console.error(`Failed to fetch employees for project ${project.id}: ${errorData.error}`);
            return [];
          }
          const employees = await response.json();
          return employees.map((emp) => ({
            project_id: project.id,
            employee_id: emp.employee_id,
            employee_name: emp.employee_name,
          }));
        } catch (error) {
          console.error(`Error fetching employees for project ${project.id}: ${error.message}`);
          return [];
        }
      });

      const adminAssignmentsData = (await Promise.all(adminAssignmentsPromises)).flat();

      setProjects(projectsData);
      setManagerAssignments(managerAssignmentsData);
      setAdminAssignments(adminAssignmentsData);
    } catch (error) {
      toast.error(`Error fetching data: ${error.message}`);
      setProjects([]);
      setManagerAssignments([]);
      setAdminAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [manager?.id]);

  useEffect(() => {
    const fetchManagerData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${BASE_URL}/api/employee-info?email=${encodeURIComponent(CURRENT_EMAIL)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch manager data");
        }
        const data = await response.json();
        setManager(data.employee || null);
        if (data.employee) {
          toast.success("Manager data loaded successfully!");
        }
      } catch (error) {
        toast.error(`Error fetching manager data: ${error.message}`);
        setManager(null);
      } finally {
        setLoading(false);
      }
    };

    fetchManagerData();
  }, []);

  useEffect(() => {
    if (manager?.id) {
      fetchProjectsAndAssignments();
    }
  }, [manager?.id, fetchProjectsAndAssignments]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 ml-16 p-8 pt-24 overflow-y-auto">
          <ToastContainer position="top-right" autoClose={3000} theme="colored" />
          <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl overflow-hidden mb-8 transform transition-all duration-300">
            <div className="bg-gradient-to-r from-gray-600 to-gray-400 p-8">
              <div className="flex items-center gap-4">
                <Users className="h-10 w-10 text-white" />
                <div>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight">Manager Projects Dashboard</h2>
                  <p className="mt-2 text-indigo-100 text-sm font-medium">Effortlessly manage employees for your assigned projects</p>
                </div>
              </div>
            </div>
            <div className="p-8">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600 dark:border-indigo-400"></div>
                </div>
              ) : (
                <ProjectAssignmentsTable
                  projects={projects}
                  assignments={managerAssignments}
                  adminAssignments={adminAssignments}
                  managerId={manager?.id}
                  onAssign={fetchProjectsAndAssignments}
                  onRemove={fetchProjectsAndAssignments}
                />
              )}
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}