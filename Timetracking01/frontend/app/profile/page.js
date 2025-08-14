"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, ChevronUp, ArrowLeft } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "../../components/header";
import Sidebar from "../../components/sidebar";
import Footer from "../../components/footer";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";
// const CURRENT_EMAIL = "tina.46@example.com"; // TODO: Replace with auth context in production
const CURRENT_EMAIL = process.env.NEXT_PUBLIC_EMAIL || "";

// HierarchyTree Component
const HierarchyTree = ({ hierarchy, currentEmployee }) => {
  const fullHierarchy = [...(hierarchy || [])].reverse().concat([currentEmployee]);

  return (
    <div className="flex flex-col items-center space-y-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      {fullHierarchy.length > 0 ? (
        fullHierarchy.map((person, index) => (
          <div key={person.id || person.email || index} className="flex flex-col items-center">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                {person.email === currentEmployee.email && <User className="h-5 w-5 text-indigo-600 dark:text-indigo-300 inline mr-2" />}
                {person.employee_name || "N/A"}
              </span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">{person.designation?.title || ""}</span>
            {index < fullHierarchy.length - 1 && (
              <ChevronUp className="text-gray-400 dark:text-gray-500 h-6 w-6 my-2" />
            )}
          </div>
        ))
      ) : (
        <div className="text-gray-500 dark:text-gray-400 text-center">No manager hierarchy available.</div>
      )}
    </div>
  );
};

// EmployeeDetails Component
export default function EmployeeDetails() {
  const [employee, setEmployee] = useState(null);
  const [managerHierarchy, setManagerHierarchy] = useState([]);
  const [department, setDepartment] = useState(null);
  const [designation, setDesignation] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
        setManagerHierarchy(data.manager_hierarchy || []);
        setDepartment(data.department || null);
        setDesignation(data.designation || null);
      } catch (error) {
        toast.error(`Error fetching employee data: ${error.message}`, {
          style: { background: "#FEE2E2", color: "#EF4444" },
        });
        setEmployee(null);
        setManagerHierarchy([]);
        setDepartment(null);
        setDesignation(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, []);

  const handleBackToToday = () => {
    router.push("/");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <div className="flex flex-1">
        <Sidebar onBackToToday={handleBackToToday} />
        <main className="flex-1 ml-16 p-8 pt-24 overflow-y-auto">
          <ToastContainer position="top-right" autoClose={3000} theme="colored" />
          <div className="max-w-[1400px] mx-auto">
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-gray-600 to-gray-500 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Employee Details</h2>
  <button
    onClick={handleBackToToday}
    className="inline-flex items-center gap-2 bg-white text-indigo-600 hover:bg-indigo-100 focus:ring-2 focus:ring-indigo-300 font-semibold px-4 py-2 rounded-md text-sm shadow transition duration-200"
    aria-label="Back to Timesheet"
  >
    <ArrowLeft className="h-5 w-5" />
    <span>Back to Timesheet</span>
  </button>
</div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                    <User className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                    Personal Information
                  </h3>
                </div>
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600 dark:border-indigo-300"></div>
                  </div>
                ) : employee ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
                      <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-gray-900 dark:text-gray-50 text-sm">
                        {employee.employee_name || "N/A"}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
                      <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-gray-900 dark:text-gray-50 text-sm">
                        {employee.email || "N/A"}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Department</label>
                      <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-gray-900 dark:text-gray-50 text-sm">
                        {department?.name || "No department"}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Designation</label>
                      <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-gray-900 dark:text-gray-50 text-sm">
                        {designation?.title || "No designation"}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Reports To</label>
                      <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-gray-900 dark:text-gray-50 text-sm">
                        {employee.reports_to || "No manager"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    Employee not found.
                  </div>
                )}
                {employee && (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                      Manager Hierarchy
                    </h3>
                    <HierarchyTree hierarchy={managerHierarchy} currentEmployee={employee} />
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