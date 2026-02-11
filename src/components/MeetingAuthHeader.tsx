"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import useAppStore from "@/store/useAppStore";
import { MdLogout, MdPerson } from "react-icons/md";

interface MeetingAuthHeaderProps {
  /** When true, component sits inline in a flex row (e.g. call screen top bar) instead of absolute positioned */
  inline?: boolean;
}

const MeetingAuthHeader: React.FC<MeetingAuthHeaderProps> = ({ inline }) => {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const logout = useAppStore((state) => state.logout);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = useCallback(() => {
    logout();
    setOpen(false);
    router.push("/");
  }, [logout, router]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div
      className={inline ? "relative z-10" : "absolute top-4 right-4 z-10"}
      ref={menuRef}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition-colors duration-200 border border-gray-300 dark:border-gray-600 shadow-sm"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Account menu"
      >
        <span className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 bg-[var(--agora-accent-blue)]">
          <MdPerson className="w-4 h-4" aria-hidden />
        </span>
        <span className="hidden sm:inline text-sm font-medium truncate max-w-[120px]">
          {user.displayName}
        </span>
        <svg
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-48 py-1 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg animate-fade-in-up"
          role="menu"
        >
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user.displayName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-150"
            role="menuitem"
          >
            <MdLogout className="w-4 h-4 shrink-0" aria-hidden />
            Log out
          </button>
        </div>
      )}
    </div>
  );
};

export default MeetingAuthHeader;
