"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export default function DateFilterDropdown({ onWeekViewSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedView, setSelectedView] = useState("week");

  const pathname = usePathname(); // ✅ App Router hook
  const router = useRouter();     // ✅ Navigation hook

  // Detect current route and update label accordingly
  useEffect(() => {
    if (pathname === "/today") {
      setSelectedView("today");
    } else {
      setSelectedView("week");
    }
  }, [pathname]);

  const handleViewChange = (view) => {
    setSelectedView(view);
    if (view === "today") {
      router.push("/today");
    } else if (view === "week") {
      router.push("/");
      onWeekViewSelect();
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white text-indigo-600 hover:bg-indigo-100 font-semibold px-2 py-2 pr-8 rounded-md text-sm shadow focus:outline-none focus:ring-2 focus:ring-indigo-300 flex items-center gap-2"
      >
        {selectedView === "week" ? (
          <>
            <Calendar className="w-4 h-4" />
            Week View
          </>
        ) : (
          <>
            <Clock className="w-4 h-4" />
            Today’s View
          </>
        )}
        <span className="ml-auto">
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-indigo-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-indigo-600" />
          )}
        </span>
      </button>

      {isOpen && (
        <div className="absolute mt-1 w-full bg-white rounded-md shadow-lg z-10">
          <div
            onClick={() => handleViewChange("week")}
            className="px-2 py-1 hover:bg-indigo-50 flex items-center gap-2 cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-indigo-600" />
            Week View
          </div>
          <div
            onClick={() => handleViewChange("today")}
            className="px-2 py-1 hover:bg-indigo-50 flex items-center gap-2 cursor-pointer"
          >
            <Clock className="w-4 h-4 text-indigo-600" />
            Today’s View
          </div>
        </div>
      )}
    </div>
  );
}
