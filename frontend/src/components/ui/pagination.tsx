import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-center space-x-2 mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        // Logic to show pages around current page
        const pageToShow = totalPages <= 5 
          ? i + 1 
          : currentPage <= 3 
            ? i + 1 
            : currentPage >= totalPages - 2 
              ? totalPages - 4 + i 
              : currentPage - 2 + i;
              
        return (
          <Button
            key={i}
            variant={currentPage === pageToShow ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(pageToShow)}
          >
            {pageToShow}
          </Button>
        );
      })}
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}