"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Calendar, History, CheckCircle, Menu, X, Users, Building, Briefcase, Folder } from "lucide-react";
import { SiGoogleanalytics } from "react-icons/si";
import { MdSpaceDashboard } from "react-icons/md";
import { BiLibrary } from "react-icons/bi";

function AdminSidebar({
  setShowAddEmployeeDialog,
  setShowAddDepartmentDialog,
  setShowAddDesignationDialog,
  setShowAddProjectDialog,
  onToggleSidebar,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  const isActive = (path) => pathname === path;

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
    if (onToggleSidebar) {
      onToggleSidebar();
    }
  };

  const menuItems = [
    { path: "/", label: "Weekly Dashboard", icon: MdSpaceDashboard },
    { path: "/today", label: "Today's Timesheet", icon: Calendar },
    { path: "/prev", label: "Previous Week", icon: History },
    { path: "/rev", label: "Reviewer Dashboard", icon: CheckCircle },
    { path: "/reports", label: "Analytics", icon: SiGoogleanalytics },
    { path: "/ap", label: "Project Dashboard", icon: BiLibrary },
  ];

  const actionItems = [
    { label: "Add Employee", icon: Users, action: () => setShowAddEmployeeDialog(true) },
    { label: "Add Department", icon: Building, action: () => setShowAddDepartmentDialog(true) },
    { label: "Add Designation", icon: Briefcase, action: () => setShowAddDesignationDialog(true) },
    { label: "Add Project", icon: Folder, action: () => setShowAddProjectDialog(true) },
  ];

  return (
    <div
      className={`fixed top-0 left-0 h-screen bg-gray-600 text-white shadow-lg flex flex-col py-6 transition-all duration-300 z-50 ${
        isExpanded ? "w-64" : "w-16"
      }`}
    >
      {/* Branded Header */}
      <div
        className={`flex items-center justify-between px-4 py-2 mb-4 bg-gray-600 ${
          isExpanded ? "w-full" : "w-16"
        } transition-all duration-300`}
      >
        {isExpanded && (
          <div className="flex items-center">
            <img
              src="/myappshub.jpeg"
              alt="MYAPPSHUB LLC Logo"
              className="h-6 w-6 mr-2"
            />
            <span className="text-white font-semibold text-sm">MYAPPSHUB LLC</span>
          </div>
        )}
        <button
          className="flex items-center justify-center h-6 w-6"
          onClick={toggleSidebar}
          title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {isExpanded ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <Menu className="h-6 w-6 text-white" />
          )}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-col space-y-4 px-2 flex-grow">
        {menuItems.map((item) => (
          <button
            key={item.path}
            className="relative group flex items-center w-full"
            onClick={() => router.push(item.path)}
            title={item.label}
          >
            <span
              className={`inline-flex items-center justify-center rounded-full p-2 transition-colors duration-300 ${
                isActive(item.path) ? "bg-indigo-400" : ""
              }`}
            >
              <item.icon
                className={`h-6 w-6 transition-colors duration-300 ${
                  isActive(item.path)
                    ? "text-indigo-900"
                    : "text-white group-hover:text-indigo-400"
                }`}
              />
            </span>
            {isExpanded && (
              <span className="ml-3 text-sm font-medium text-white">
                {item.label}
              </span>
            )}
            {!isExpanded && (
              <span
                className="absolute left-12 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap"
              >
                {item.label}
              </span>
            )}
          </button>
        ))}
        <hr className="my-4 border-gray-500" />
        {actionItems.map((item) => (
          <button
            key={item.label}
            className="relative group flex items-center w-full"
            onClick={item.action}
            title={item.label}
          >
            <span
              className="inline-flex items-center justify-center rounded-full p-2 transition-colors duration-300"
            >
              <item.icon
                className="h-6 w-6 text-white group-hover:text-indigo-400 transition-colors duration-300"
              />
            </span>
            {isExpanded && (
              <span className="ml-3 text-sm font-medium text-white">
                {item.label}
              </span>
            )}
            {!isExpanded && (
              <span
                className="absolute left-12 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap"
              >
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default AdminSidebar;