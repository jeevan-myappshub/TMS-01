"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Calendar, History, CheckCircle, Menu, X, Users, Building, Briefcase, Folder } from "lucide-react";
import { SiGoogleanalytics } from "react-icons/si";
import { MdSpaceDashboard } from "react-icons/md";
import { BiLibrary } from "react-icons/bi";
import AdminSidebar from "../../components/adminsidebar";

// Constants
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";
const EMPLOYEE_PAGE_SIZE = 5;
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
  searchDepartmentId,
  setSearchDepartmentId,
  searchDesignationId,
  setSearchDesignationId,
  searchProjectId,
  setSearchProjectId,
  departments,
  filteredDesignations,
  projects,
  loading,
  handleSearch,
  handleClearSearch,
}) {
  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
      <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="search-query" className="text-sm font-medium text-gray-700">
            Search
          </Label>
          <Input
            id="search-query"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email"
            className="mt-1 border-gray-300 focus:ring-blue-500 text-sm"
            aria-label="Search by employee name or email"
          />
        </div>
        <div>
          <Label htmlFor="search-department" className="text-sm font-medium text-gray-700">
            Department
          </Label>
          <Select value={searchDepartmentId} onValueChange={setSearchDepartmentId}>
            <SelectTrigger id="search-department" className="mt-1 text-sm" aria-label="Select department for search">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={String(dept.id)}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="search-designation" className="text-sm font-medium text-gray-700">
            Designation
          </Label>
          <Select value={searchDesignationId} onValueChange={setSearchDesignationId}>
            <SelectTrigger id="search-designation" className="mt-1 text-sm" aria-label="Select designation for search">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {filteredDesignations.map((des) => (
                <SelectItem key={des.id} value={String(des.id)}>
                  {des.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="search-project" className="text-sm font-medium text-gray-700">
            Project
          </Label>
          <Select value={searchProjectId} onValueChange={setSearchProjectId}>
            <SelectTrigger id="search-project" className="mt-1 text-sm" aria-label="Select project for search">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {projects.map((proj) => (
                <SelectItem key={proj.id} value={String(proj.id)}>
                  {proj.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-4 flex justify-end gap-2">
          <Button
            type="submit"
            variant="default"
            size="sm"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            aria-label="Search employees"
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

// Employee Table Component
function EmployeeTable({ employees, currentPage, managers, handlePageChange, totalPages }) {
  const paginatedEmployees = useMemo(() => {
    return employees.slice(
      (currentPage - 1) * EMPLOYEE_PAGE_SIZE,
      currentPage * EMPLOYEE_PAGE_SIZE
    );
  }, [employees, currentPage]);

  const getManagerName = (reportsTo) => {
    if (!reportsTo) return "None";
    return managers[reportsTo] || "Unknown";
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-sm font-semibold text-gray-700 py-3">ID</TableHead>
            <TableHead className="text-sm font-semibold text-gray-700 py-3">Name</TableHead>
            <TableHead className="text-sm font-semibold text-gray-700 py-3">Email</TableHead>
            <TableHead className="text-sm font-semibold text-gray-700 py-3">Department</TableHead>
            <TableHead className="text-sm font-semibold text-gray-700 py-3">Designation</TableHead>
            <TableHead className="text-sm font-semibold text-gray-700 py-3">Reports to</TableHead>
            <TableHead className="text-sm font-semibold text-gray-700 py-3">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedEmployees.map((emp, index) => (
            <TableRow
              key={emp.id}
              className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-gray-100" : "bg-white"}`}
            >
              <TableCell className="py-3 text-gray-800 text-sm">{emp.id}</TableCell>
              <TableCell className="py-3 text-gray-800 text-sm">{emp.employee_name}</TableCell>
              <TableCell className="py-3 text-gray-800 text-sm">{emp.email}</TableCell>
              <TableCell className="py-3 text-gray-800 text-sm">{emp.department?.name || "None"}</TableCell>
              <TableCell className="py-3 text-gray-800 text-sm">{emp.designation?.title || "None"}</TableCell>
              <TableCell className="py-3 text-gray-800 text-sm">{getManagerName(emp.reports_to)}</TableCell>
              <TableCell className="py-3">
                <Link href={`/employee/${emp.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`View daily entries for ${emp.employee_name}`}
                    className="text-blue-600 hover:bg-blue-50 font-semibold"
                  >
                    View Daily Entries
                  </Button>
                </Link>
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
            aria-label="Previous page of employees"
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
            aria-label="Next page of employees"
            className="text-gray-700 hover:bg-gray-100"
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}

// Add Employee Dialog Component
function AddEmployeeDialog({
  showAddEmployeeDialog,
  setShowAddEmployeeDialog,
  newEmpName,
  setNewEmpName,
  newEmpEmail,
  setNewEmpEmail,
  newEmpManagerId,
  setNewEmpManagerId,
  newEmpDepartmentId,
  setNewEmpDepartmentId,
  newEmpDesignationId,
  setNewEmpDesignationId,
  allEmployees,
  departments,
  filteredDesignations,
  loading,
  handleAddEmployee,
}) {
  return (
    <Dialog
      open={showAddEmployeeDialog}
      onOpenChange={(open) => {
        setShowAddEmployeeDialog(open);
        if (!open) {
          setNewEmpName("");
          setNewEmpEmail("");
          setNewEmpManagerId("");
          setNewEmpDepartmentId("");
          setNewEmpDesignationId("");
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-xl font-bold text-gray-800">Add New Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddEmployee} className="space-y-4 py-4">
          <div>
            <Label htmlFor="emp-name" className="text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="emp-name"
              value={newEmpName}
              onChange={(e) => setNewEmpName(e.target.value)}
              required
              placeholder="Enter employee name"
              className="mt-1 border-gray-300 focus:ring-blue-500 text-sm"
              aria-required="true"
            />
          </div>
          <div>
            <Label htmlFor="emp-email" className="text-sm font-medium text-gray-700">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="emp-email"
              type="email"
              value={newEmpEmail}
              onChange={(e) => setNewEmpEmail(e.target.value)}
              required
              placeholder="Enter employee email"
              className="mt-1 border-gray-300 focus:ring-blue-500 text-sm"
              aria-required="true"
            />
          </div>
          <div>
            <Label htmlFor="emp-manager-id" className="text-sm font-medium text-gray-700">
              Reports to (Optional)
            </Label>
            <Select value={newEmpManagerId} onValueChange={setNewEmpManagerId}>
              <SelectTrigger id="emp-manager-id" aria-label="Select manager" className="mt-1 text-sm">
                <SelectValue placeholder="Select Manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {allEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    {emp.employee_name} (ID: {emp.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="emp-department-id" className="text-sm font-medium text-gray-700">
              Department <span className="text-red-500">*</span>
            </Label>
            <Select value={newEmpDepartmentId} onValueChange={setNewEmpDepartmentId} required>
              <SelectTrigger id="emp-department-id" aria-label="Select department" className="mt-1 text-sm">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="emp-designation-id" className="text-sm font-medium text-gray-700">
              Designation <span className="text-red-500">*</span>
            </Label>
            <Select
              value={newEmpDesignationId}
              onValueChange={setNewEmpDesignationId}
              required
              disabled={!newEmpDepartmentId || loading}
            >
              <SelectTrigger id="emp-designation-id" aria-label="Select designation" className="mt-1 text-sm">
                <SelectValue placeholder="Select Designation" />
              </SelectTrigger>
              <SelectContent>
                {filteredDesignations.length === 0 ? (
                  <SelectItem value="none" disabled>
                    {newEmpDepartmentId ? "No designations available for this department" : "Please select a department first"}
                  </SelectItem>
                ) : (
                  filteredDesignations.map((des) => (
                    <SelectItem key={des.id} value={String(des.id)}>
                      {des.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddEmployeeDialog(false)}
              disabled={loading}
              aria-label="Cancel adding employee"
              className="text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={loading}
              aria-label="Add employee"
              className="bg-blue-600 hover:bg-blue-700"
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
                  Adding...
                </span>
              ) : (
                "Add Employee"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add Project Dialog Component
function AddProjectDialog({
  showAddProjectDialog,
  setShowAddProjectDialog,
  newProjName,
  setNewProjName,
  newProjDescription,
  setNewProjDescription,
  newProjManagerId,
  setNewProjManagerId,
  loading,
  handleAddProject,
  allEmployees,
}) {
  return (
    <Dialog
      open={showAddProjectDialog}
      onOpenChange={(open) => {
        setShowAddProjectDialog(open);
        if (!open) {
          setNewProjName("");
          setNewProjDescription("");
          setNewProjManagerId("");
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-xl font-bold text-gray-800">Add New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddProject} className="space-y-4 py-4">
          <div>
            <Label htmlFor="proj-name" className="text-sm font-medium text-gray-700">
              Project Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="proj-name"
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              required
              placeholder="Enter project name"
              autoComplete="off"
              className="mt-1 border-gray-300 focus:ring-blue-500 text-sm"
              aria-required="true"
            />
          </div>
          <div>
            <Label htmlFor="proj-description" className="text-sm font-medium text-gray-700">
              Description (Optional)
            </Label>
            <Input
              id="proj-description"
              value={newProjDescription}
              onChange={(e) => setNewProjDescription(e.target.value)}
              placeholder="Enter project description"
              autoComplete="off"
              className="mt-1 border-gray-300 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="proj-manager-id" className="text-sm font-medium text-gray-700">
              Assign to Manager (Optional)
            </Label>
            <Select value={newProjManagerId} onValueChange={setNewProjManagerId}>
              <SelectTrigger id="proj-manager-id" aria-label="Select manager" className="mt-1 text-sm">
                <SelectValue placeholder="Select Manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {allEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    {emp.employee_name} (ID: {emp.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddProjectDialog(false)}
              disabled={loading}
              aria-label="Cancel adding project"
              className="text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={loading}
              aria-label="Add project"
              className="bg-blue-600 hover:bg-blue-700"
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
                  Adding...
                </span>
              ) : (
                "Add Project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add Department Dialog Component
function AddDepartmentDialog({
  showAddDepartmentDialog,
  setShowAddDepartmentDialog,
  newDeptName,
  setNewDeptName,
  loading,
  handleAddDepartment,
}) {
  return (
    <Dialog
      open={showAddDepartmentDialog}
      onOpenChange={(open) => {
        setShowAddDepartmentDialog(open);
        if (!open) setNewDeptName("");
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-xl font-bold text-gray-800">Add New Department</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddDepartment} className="space-y-4 py-4">
          <div>
            <Label htmlFor="dept-name" className="text-sm font-medium text-gray-700">
              Department Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="dept-name"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              required
              placeholder="Enter department name"
              className="mt-1 border-gray-300 focus:ring-blue-500 text-sm"
              aria-required="true"
            />
          </div>
          <DialogFooter className="border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddDepartmentDialog(false)}
              disabled={loading}
              aria-label="Cancel adding department"
              className="text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={loading}
              aria-label="Add department"
              className="bg-blue-600 hover:bg-blue-700"
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
                  Adding...
                </span>
              ) : (
                "Add Department"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Add Designation Dialog Component
function AddDesignationDialog({
  showAddDesignationDialog,
  setShowAddDesignationDialog,
  newDesTitle,
  setNewDesTitle,
  newDesDepartmentId,
  setNewDesDepartmentId,
  departments,
  loading,
  handleAddDesignation,
}) {
  return (
    <Dialog
      open={showAddDesignationDialog}
      onOpenChange={(open) => {
        setShowAddDesignationDialog(open);
        if (!open) {
          setNewDesTitle("");
          setNewDesDepartmentId("");
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-xl font-bold text-gray-800">Add New Designation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddDesignation} className="space-y-4 py-4">
          <div>
            <Label htmlFor="des-title" className="text-sm font-medium text-gray-700">
              Designation Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="des-title"
              value={newDesTitle}
              onChange={(e) => setNewDesTitle(e.target.value)}
              required
              placeholder="Enter designation title"
              className="mt-1 border-gray-300 focus:ring-blue-500 text-sm"
              aria-required="true"
            />
          </div>
          <div>
            <Label htmlFor="des-department-id" className="text-sm font-medium text-gray-700">
              Department <span className="text-red-500">*</span>
            </Label>
            <Select value={newDesDepartmentId} onValueChange={setNewDesDepartmentId} required>
              <SelectTrigger id="des-department-id" aria-label="Select department" className="mt-1 text-sm">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddDesignationDialog(false)}
              disabled={loading}
              aria-label="Cancel adding designation"
              className="text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={loading}
              aria-label="Add designation"
              className="bg-blue-600 hover:bg-blue-700"
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
                  Adding...
                </span>
              ) : (
                "Add Designation"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Main AdminPage Component
export default function AdminPage() {
  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [managers, setManagers] = useState({});
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [filteredDesignations, setFilteredDesignations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddEmployeeDialog, setShowAddEmployeeDialog] = useState(false);
  const [showAddDepartmentDialog, setShowAddDepartmentDialog] = useState(false);
  const [showAddDesignationDialog, setShowAddDesignationDialog] = useState(false);
  const [showAddProjectDialog, setShowAddProjectDialog] = useState(false);
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpManagerId, setNewEmpManagerId] = useState("");
  const [newEmpDepartmentId, setNewEmpDepartmentId] = useState("");
  const [newEmpDesignationId, setNewEmpDesignationId] = useState("");
  const [newDeptName, setNewDeptName] = useState("");
  const [newDesTitle, setNewDesTitle] = useState("");
  const [newDesDepartmentId, setNewDesDepartmentId] = useState("");
  const [newProjName, setNewProjName] = useState("");
  const [newProjDescription, setNewProjDescription] = useState("");
  const [newProjManagerId, setNewProjManagerId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDepartmentId, setSearchDepartmentId] = useState("all");
  const [searchDesignationId, setSearchDesignationId] = useState("all");
  const [searchProjectId, setSearchProjectId] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const abortControllerRef = useRef(null);

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle sidebar toggle
  const handleToggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      abortControllerRef.current = new AbortController();
      try {
        const res = await fetch(`${BASE_URL}/api/dashboard/init`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: abortControllerRef.current.signal,
        });
        if (!res.ok) throw new Error(`Failed to fetch dashboard data: ${res.statusText}`);
        const data = await res.json();

        const sortedEmployees = Array.isArray(data.employees)
          ? data.employees.sort((a, b) => a.id - b.id)
          : [];
        setEmployees(sortedEmployees);
        setAllEmployees(sortedEmployees);
        setDepartments(Array.isArray(data.departments) ? data.departments.sort((a, b) => a.id - b.id) : []);
        setDesignations(Array.isArray(data.designations) ? data.designations.sort((a, b) => a.id - b.id) : []);
        setFilteredDesignations(Array.isArray(data.designations) ? data.designations : []);
        setProjects(Array.isArray(data.projects) ? data.projects.sort((a, b) => a.id - b.id) : []);

        const mgrMap = {};
        sortedEmployees.forEach((emp) => {
          mgrMap[emp.id] = emp.employee_name;
        });
        setManagers(mgrMap);
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("Error fetching dashboard data:", error);
        toast.error(error.message || "Failed to fetch dashboard data", toastConfig);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Update filtered designations
  useEffect(() => {
    const departmentId = newEmpDepartmentId || searchDepartmentId;
    if (departmentId && departmentId !== "all") {
      const filtered = designations.filter((des) => des.department_id === parseInt(departmentId, 10));
      setFilteredDesignations(filtered);
      if (newEmpDepartmentId) setNewEmpDesignationId("");
      if (searchDepartmentId) setSearchDesignationId("all");
    } else {
      setFilteredDesignations(designations);
      if (newEmpDepartmentId) setNewEmpDesignationId("");
      if (searchDepartmentId) setSearchDesignationId("all");
    }
  }, [newEmpDepartmentId, searchDepartmentId, designations]);

  // Search handler
  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery.trim());
      if (searchDepartmentId && searchDepartmentId !== "all")
        params.append("department_id", searchDepartmentId);
      if (searchDesignationId && searchDesignationId !== "all")
        params.append("designation_id", searchDesignationId);
      if (searchProjectId && searchProjectId !== "all")
        params.append("project_id", searchProjectId);

      abortControllerRef.current = new AbortController();
      const res = await fetch(`${BASE_URL}/api/dashboard/init?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) throw new Error(`Failed to fetch dashboard data: ${res.statusText}`);
      const data = await res.json();

      const sortedEmployees = Array.isArray(data.employees)
        ? data.employees.sort((a, b) => a.id - b.id)
        : [];
      setEmployees(sortedEmployees);
      setFilteredDesignations(
        Array.isArray(data.designations) ? data.designations.sort((a, b) => a.id - b.id) : []
      );
      setCurrentPage(1);
      toast.success(`Found ${sortedEmployees.length} employee${sortedEmployees.length === 1 ? "" : "s"}`, toastConfig);
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("Error in search:", error);
      toast.error(error.message || "Failed to filter employees", toastConfig);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, searchDepartmentId, searchDesignationId, searchProjectId]);

  // Clear search handler
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchProjectId("all");
    setSearchDepartmentId("all");
    setSearchDesignationId("all");
    setEmployees(allEmployees);
    setFilteredDesignations(designations);
    setCurrentPage(1);
    toast.success("Filters cleared, showing all employees", toastConfig);
  }, [allEmployees, designations]);

  // Add department handler
  const handleAddDepartment = useCallback(async (e) => {
    e.preventDefault();
    const trimmedName = newDeptName.trim();
    if (!trimmedName) {
      toast.error("Department name is required.", toastConfig);
      return;
    }

    setLoading(true);
    try {
      abortControllerRef.current = new AbortController();
      const res = await fetch(`${BASE_URL}/api/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to add department: ${res.statusText}`);
      }

      toast.success("Department added successfully!", toastConfig);
      setShowAddDepartmentDialog(false);
      setNewDeptName("");

      const deptRes = await fetch(`${BASE_URL}/api/departments`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: abortControllerRef.current.signal,
      });
      if (!deptRes.ok) throw new Error(`Failed to fetch departments: ${deptRes.statusText}`);
      const deptData = await deptRes.json();
      setDepartments(Array.isArray(deptData) ? deptData.sort((a, b) => a.id - b.id) : []);
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("Error adding department:", error);
      toast.error(error.message || "Failed to add department", toastConfig);
    } finally {
      setLoading(false);
    }
  }, [newDeptName]);

  // Add designation handler
  const handleAddDesignation = useCallback(async (e) => {
    e.preventDefault();
    const trimmedTitle = newDesTitle.trim();
    if (!trimmedTitle) {
      toast.error("Designation title is required.", toastConfig);
      return;
    }
    if (!newDesDepartmentId) {
      toast.error("Department is required.", toastConfig);
      return;
    }

    setLoading(true);
    try {
      if (!BASE_URL) {
        throw new Error("BASE_URL is not defined. Please check your environment variables.");
      }
      const payload = {
        title: trimmedTitle,
        department_id: parseInt(newDesDepartmentId, 10),
      };
      abortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => abortControllerRef.current.abort(), 10000);
      const res = await fetch(`${BASE_URL}/api/designations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 400) {
          throw new Error(err.error || "Invalid designation data provided.");
        } else if (res.status === 404) {
          throw new Error("Designation endpoint not found. Check the backend server.");
        } else {
          throw new Error(err.error || `Failed to add designation: ${res.statusText}`);
        }
      }

      toast.success("Designation added successfully!", toastConfig);
      setShowAddDesignationDialog(false);
      setNewDesTitle("");
      setNewDesDepartmentId("");

      const desRes = await fetch(`${BASE_URL}/api/designations`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: abortControllerRef.current.signal,
      });
      if (!desRes.ok) throw new Error(`Failed to fetch designations: ${desRes.statusText}`);
      const desData = await desRes.json();
      setDesignations(Array.isArray(desData) ? desData.sort((a, b) => a.id - b.id) : []);
      setFilteredDesignations(Array.isArray(desData) ? desData : []);
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("Error adding designation:", error);
      toast.error(error.message || "Failed to add designation", toastConfig);
    } finally {
      setLoading(false);
    }
  }, [newDesTitle, newDesDepartmentId]);

  // Add employee handler
  const handleAddEmployee = useCallback(async (e) => {
    e.preventDefault();
    const trimmedName = newEmpName.trim();
    const trimmedEmail = newEmpEmail.trim();

    if (!trimmedName || !trimmedEmail || !newEmpDepartmentId || !newEmpDesignationId) {
      toast.error("Name, email, department, and designation are required.", toastConfig);
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      toast.error("Invalid email format.", toastConfig);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        employee_name: trimmedName,
        email: trimmedEmail,
        reports_to_id: newEmpManagerId === "none" ? null : parseInt(newEmpManagerId, 10),
        department_id: parseInt(newEmpDepartmentId, 10),
        designation_id: parseInt(newEmpDesignationId, 10),
      };
      abortControllerRef.current = new AbortController();
      const res = await fetch(`${BASE_URL}/api/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to add employee: ${res.statusText}`);
      }

      toast.success("Employee added successfully!", toastConfig);
      setShowAddEmployeeDialog(false);
      setNewEmpName("");
      setNewEmpEmail("");
      setNewEmpManagerId("");
      setNewEmpDepartmentId("");
      setNewEmpDesignationId("");

      const resDashboard = await fetch(`${BASE_URL}/api/dashboard/init`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: abortControllerRef.current.signal,
      });
      if (!resDashboard.ok) throw new Error(`Failed to fetch dashboard data: ${resDashboard.statusText}`);
      const data = await resDashboard.json();
      setAllEmployees(Array.isArray(data.employees) ? data.employees.sort((a, b) => a.id - b.id) : []);
      setEmployees(Array.isArray(data.employees) ? data.employees.sort((a, b) => a.id - b.id) : []);
      setDepartments(Array.isArray(data.departments) ? data.departments.sort((a, b) => a.id - b.id) : []);
      setDesignations(Array.isArray(data.designations) ? data.designations.sort((a, b) => a.id - b.id) : []);
      setFilteredDesignations(Array.isArray(data.designations) ? data.designations : []);
      setProjects(Array.isArray(data.projects) ? data.projects.sort((a, b) => a.id - b.id) : []);

      const mgrMap = {};
      data.employees.forEach((emp) => {
        mgrMap[emp.id] = emp.employee_name;
      });
      setManagers(mgrMap);
      setCurrentPage(1);
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("Error adding employee:", error);
      toast.error(error.message || "Failed to add employee", toastConfig);
    } finally {
      setLoading(false);
    }
  }, [newEmpName, newEmpEmail, newEmpManagerId, newEmpDepartmentId, newEmpDesignationId]);

  // Add project handler
  const handleAddProject = useCallback(async (e) => {
    e.preventDefault();
    const trimmedName = newProjName.trim();

    if (!trimmedName) {
      toast.error("Project name is required.", toastConfig);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: trimmedName,
        description: newProjDescription.trim() || "",
        manager_id: newProjManagerId && newProjManagerId !== "none" ? parseInt(newProjManagerId, 10) : undefined,
      };
      abortControllerRef.current = new AbortController();
      const res = await fetch(`${BASE_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to add project: ${res.statusText}`);
      }

      toast.success("Project added and manager assigned!", toastConfig);
      setShowAddProjectDialog(false);
      setNewProjName("");
      setNewProjDescription("");
      setNewProjManagerId("");

      const projRes = await fetch(`${BASE_URL}/api/projects`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: abortControllerRef.current.signal,
      });
      if (!projRes.ok) throw new Error(`Failed to fetch projects: ${projRes.statusText}`);
      const projData = await projRes.json();
      setProjects(Array.isArray(projData) ? projData.sort((a, b) => a.id - b.id) : []);

      const resDashboard = await fetch(`${BASE_URL}/api/dashboard/init`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: abortControllerRef.current.signal,
      });
      if (!resDashboard.ok) throw new Error(`Failed to fetch dashboard data: ${resDashboard.statusText}`);
      const data = await resDashboard.json();
      const sortedEmployees = Array.isArray(data.employees)
        ? data.employees.sort((a, b) => a.id - b.id)
        : [];
      setAllEmployees(sortedEmployees);
      setEmployees(sortedEmployees);
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("Error adding project:", error);
      toast.error(error.message || "Failed to add project", toastConfig);
    } finally {
      setLoading(false);
    }
  }, [newProjName, newProjDescription, newProjManagerId]);

  // Pagination
  const totalPages = Math.ceil(employees.length / EMPLOYEE_PAGE_SIZE);
  const handlePageChange = useCallback((page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  }, [totalPages]);

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
            <CardTitle className="text-xl font-bold">Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <SearchForm
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchDepartmentId={searchDepartmentId}
              setSearchDepartmentId={setSearchDepartmentId}
              searchDesignationId={searchDesignationId}
              setSearchDesignationId={setSearchDesignationId}
              searchProjectId={searchProjectId}
              setSearchProjectId={setSearchProjectId}
              departments={departments}
              filteredDesignations={filteredDesignations}
              projects={projects}
              loading={loading}
              handleSearch={handleSearch}
              handleClearSearch={handleClearSearch}
            />
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">All Employees</h2>
              {employees.length > 0 && (
                <span className="text-xs text-gray-600">
                  Showing {employees.length} employee{employees.length === 1 ? "" : "s"}
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
            ) : employees.length === 0 ? (
              <div className="text-gray-500 text-center py-6 text-sm">
                No employees found.
              </div>
            ) : (
              <EmployeeTable
                employees={employees}
                currentPage={currentPage}
                managers={managers}
                handlePageChange={handlePageChange}
                totalPages={totalPages}
              />
            )}
          </CardContent>
        </Card>
        <AddEmployeeDialog
          showAddEmployeeDialog={showAddEmployeeDialog}
          setShowAddEmployeeDialog={setShowAddEmployeeDialog}
          newEmpName={newEmpName}
          setNewEmpName={setNewEmpName}
          newEmpEmail={newEmpEmail}
          setNewEmpEmail={setNewEmpEmail}
          newEmpManagerId={newEmpManagerId}
          setNewEmpManagerId={setNewEmpManagerId}
          newEmpDepartmentId={newEmpDepartmentId}
          setNewEmpDepartmentId={setNewEmpDepartmentId}
          newEmpDesignationId={newEmpDesignationId}
          setNewEmpDesignationId={setNewEmpDesignationId}
          allEmployees={allEmployees}
          departments={departments}
          filteredDesignations={filteredDesignations}
          loading={loading}
          handleAddEmployee={handleAddEmployee}
        />
        <AddDepartmentDialog
          showAddDepartmentDialog={showAddDepartmentDialog}
          setShowAddDepartmentDialog={setShowAddDepartmentDialog}
          newDeptName={newDeptName}
          setNewDeptName={setNewDeptName}
          loading={loading}
          handleAddDepartment={handleAddDepartment}
        />
        <AddDesignationDialog
          showAddDesignationDialog={showAddDesignationDialog}
          setShowAddDesignationDialog={setShowAddDesignationDialog}
          newDesTitle={newDesTitle}
          setNewDesTitle={setNewDesTitle}
          newDesDepartmentId={newDesDepartmentId}
          setNewDesDepartmentId={setNewDesDepartmentId}
          departments={departments}
          loading={loading}
          handleAddDesignation={handleAddDesignation}
        />
        <AddProjectDialog
          showAddProjectDialog={showAddProjectDialog}
          setShowAddProjectDialog={setShowAddProjectDialog}
          newProjName={newProjName}
          setNewProjName={setNewProjName}
          newProjDescription={newProjDescription}
          setNewProjDescription={setNewProjDescription}
          newProjManagerId={newProjManagerId}
          setNewProjManagerId={setNewProjManagerId}
          loading={loading}
          handleAddProject={handleAddProject}
          allEmployees={allEmployees}
        />
      </div>
    </div>
  );
}