// import { useRouter, usePathname } from "next/navigation";
// import { Calendar, History, CheckCircle } from "lucide-react";
// import { SiGoogleanalytics } from "react-icons/si";
// import { MdSpaceDashboard } from "react-icons/md";
// import { BiLibrary } from "react-icons/bi";

// function Sidebar() {
//   const router = useRouter();
//   const pathname = usePathname();

//   const isActive = (path) => pathname === path;

//   return (
//     <div className="fixed top-0 left-0 h-[calc(100%-64px)] w-16 bg-gray-700 text-white shadow-lg flex flex-col items-center py-6 mt-16">
//       <nav className="flex flex-col items-center space-y-6">

//         {/* Weekly Dashboard */}
//         <button
//           className="relative group"
//           onClick={() => router.push("/")}
//           title="Weekly Dashboard"
//         >
//           <span
//             className={`inline-flex items-center justify-center rounded-full p-1 transition-colors duration-300 ${
//               isActive("/") ? "bg-indigo-400" : ""
//             }`}
//           >
//             <MdSpaceDashboard
//               className={`h-6 w-6 transition-colors duration-300 ${
//                 isActive("/") ? "text-indigo-900" : "text-white hover:text-indigo-400"
//               }`}
//             />
//           </span>
//           <span className="absolute left-12 top-1/2 transform -translate-y-1/2 
//             bg-gray-800 text-white text-xs px-2 py-1 rounded-md 
//             opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
//             Weekly Dashboard
//           </span>
//         </button>

//         {/* Today's Dashboard */}
//         <button
//           className="relative group"
//           onClick={() => router.push("/today")}
//           title="Today's Timesheet"
//         >
//           <span
//             className={`inline-flex items-center justify-center rounded-full p-1 transition-colors duration-300 ${
//               isActive("/today") ? "bg-indigo-400" : ""
//             }`}
//           >
//             <Calendar
//               className={`h-6 w-6 transition-colors duration-300 ${
//                 isActive("/today") ? "text-indigo-900" : "text-white hover:text-indigo-400"
//               }`}
//             />
//           </span>
//           <span className="absolute left-12 top-1/2 transform -translate-y-1/2 
//             bg-gray-800 text-white text-xs px-2 py-1 rounded-md 
//             opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
//             Today's Dashboard
//           </span>
//         </button>

//         {/* Previous Week */}
//         <button
//           className="relative group"
//           onClick={() => router.push("/prev")}
//           title="Previous Week"
//         >
//           <span
//             className={`inline-flex items-center justify-center rounded-full p-1 transition-colors duration-300 ${
//               isActive("/prev") ? "bg-indigo-400" : ""
//             }`}
//           >
//             <History
//               className={`h-6 w-6 transition-colors duration-300 ${
//                 isActive("/prev") ? "text-indigo-900" : "text-white hover:text-indigo-400"
//               }`}
//             />
//           </span>
//           <span className="absolute left-12 top-1/2 transform -translate-y-1/2 
//             bg-gray-800 text-white text-xs px-2 py-1 rounded-md 
//             opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
//             Previous Week
//           </span>
//         </button>

//         {/* Reviewer Dashboard */}
//         <button
//           className="relative group"
//           onClick={() => router.push("/rev")}
//           title="Reviewer Dashboard"
//         >
//           <span
//             className={`inline-flex items-center justify-center rounded-full p-1 transition-colors duration-300 ${
//               isActive("/rev") ? "bg-indigo-400" : ""
//             }`}
//           >
//             <CheckCircle
//               className={`h-6 w-6 transition-colors duration-300 ${
//                 isActive("/rev") ? "text-indigo-900" : "text-white hover:text-indigo-400"
//               }`}
//             />
//           </span>
//           <span className="absolute left-12 top-1/2 transform -translate-y-1/2 
//             bg-gray-800 text-white text-xs px-2 py-1 rounded-md 
//             opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
//             Reviewer Dashboard
//           </span>
//         </button>

//         {/* Analytics */}
//         <button
//           className="relative group"
//           onClick={() => router.push("/reports")}
//           title="Analytics"
//         >
//           <span
//             className={`inline-flex items-center justify-center rounded-full p-1 transition-colors duration-300 ${
//               isActive("/reports") ? "bg-indigo-400" : ""
//             }`}
//           >
//             <SiGoogleanalytics
//               className={`h-6 w-6 transition-colors duration-300 ${
//                 isActive("/reports") ? "text-indigo-900" : "text-white hover:text-indigo-400"
//               }`}
//             />
//           </span>
//           <span className="absolute left-12 top-1/2 transform -translate-y-1/2 
//             bg-gray-800 text-white text-xs px-2 py-1 rounded-md 
//             opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
//             Analytics
//           </span>
//         </button>

//         {/* Projects */}
//         <button
//           className="relative group"
//           onClick={() => router.push("/projects")}
//           title="Projects"
//         >
//           <span
//             className={`inline-flex items-center justify-center rounded-full p-1 transition-colors duration-300 ${
//               isActive("/projects") ? "bg-indigo-400" : ""
//             }`}
//           >
//             <BiLibrary
//               className={`h-6 w-6 transition-colors duration-300 ${
//                 isActive("/projects") ? "text-indigo-900" : "text-white hover:text-indigo-400"
//               }`}
//             />
//           </span>
//           <span className="absolute left-12 top-1/2 transform -translate-y-1/2 
//             bg-gray-800 text-white text-xs px-2 py-1 rounded-md 
//             opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
//             Project Dashboard
//           </span>
//         </button>
//       </nav>
//     </div>
//   );
// }

// export default Sidebar;













import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Calendar, History, CheckCircle, Menu, X, Bell, User } from "lucide-react";
import { SiGoogleanalytics } from "react-icons/si";
import { MdSpaceDashboard } from "react-icons/md";
import { BiLibrary } from "react-icons/bi";

function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  const isActive = (path) => pathname === path;

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const menuItems = [
    { path: "/", label: "Weekly Dashboard", icon: MdSpaceDashboard },
    { path: "/today", label: "Today's Timesheet", icon: Calendar },
    { path: "/prev", label: "Previous Week", icon: History },
    { path: "/rev", label: "Reviewer Dashboard", icon: CheckCircle },
    { path: "/reports", label: "Analytics", icon: SiGoogleanalytics },
    { path: "/projects", label: "Project Dashboard", icon: BiLibrary },
  ];

  return (
    <div
      className={`fixed top-0 left-0 h-screen bg-gray-600 text-white shadow-lg flex flex-col py-6 transition-all duration-300 z-50 ${
        isExpanded ? "w-64" : "w-16"
      }`}
    >
      {/* Branded Header integrated into sidebar */}
      <div
        className={`flex items-center justify-between px-4 py-2 mb-4 bg-gray-600 ${
          isExpanded ? "w-full" : "w-16"
        } transition-all duration-300`}
      >
        {isExpanded && (
          <div className="flex items-center">
            <img
              src="/../myappshub.jpeg"
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
      </nav>
    </div>
  );
}

export default Sidebar;