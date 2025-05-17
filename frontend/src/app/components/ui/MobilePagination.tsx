import React from "react";

interface MobilePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const MobilePagination: React.FC<MobilePaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => (
  <div className="flex w-full gap-2 mt-2">
    <button
      className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium disabled:opacity-50"
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage === 1}
    >
      Previous
    </button>
    <button
      className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium disabled:opacity-50"
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage === totalPages}
    >
      Next
    </button>
  </div>
);

export default MobilePagination;
