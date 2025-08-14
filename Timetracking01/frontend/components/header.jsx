"use client";

import { Bell, User } from "lucide-react";
import { useRouter } from "next/navigation";

function Header() {
  const router = useRouter();

  return (
    <header className="fixed top-0 left-0 w-full bg-gradient-to-r from-indigo-500 to-blue-400 text-white shadow-md z-50 h-16 flex items-center px-6">
      <div className="w-16"></div>
      <div className="flex-1 flex justify-center">
        <h1 className="text-xl font-bold">Timesheet Management</h1>
      </div>
      <div className="flex items-center gap-4">
        <Bell className="w-6 h-6 cursor-pointer hover:text-indigo-300" aria-label="Notifications" />
        <User
          className="w-6 h-6 cursor-pointer hover:text-indigo-300"
          onClick={() => router.push("/profile")}
          aria-label="View Employee Details"
        />
      </div>
    </header>
  );
}

export default Header;


