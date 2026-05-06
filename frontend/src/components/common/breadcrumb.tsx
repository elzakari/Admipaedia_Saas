import React from "react";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2">
        <li className="inline-flex items-center">
          <a href="/" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
            <Home className="w-4 h-4 mr-2" />
            Home
          </a>
        </li>
        {items.map((item, index) => (
          <li key={index}>
            <div className="flex items-center">
              <ChevronRight className="w-4 h-4 text-slate-400" />
              {index === items.length - 1 ? (
                <span className="ml-1 text-sm font-medium text-slate-700 dark:text-slate-300 md:ml-2">
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href || "#"}
                  className="ml-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 md:ml-2"
                >
                  {item.label}
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}