import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

type PagerProps = {
  page: number;
  pageCount: number;
  start: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function Pager({ page, pageCount, start, pageSize, total, onPageChange }: PagerProps) {
  return (
    <div className="pager" aria-label="Line pagination">
      <button onClick={() => onPageChange(0)} disabled={page === 0} aria-label="First page"><ChevronsLeft size={20} /></button>
      <button onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0} aria-label="Previous page"><ChevronLeft size={22} /></button>
      <div>{total === 0 ? 0 : start + 1}-{Math.min(start + pageSize, total)} / {total}</div>
      <button onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))} disabled={page >= pageCount - 1} aria-label="Next page"><ChevronRight size={22} /></button>
      <button onClick={() => onPageChange(pageCount - 1)} disabled={page >= pageCount - 1} aria-label="Last page"><ChevronsRight size={20} /></button>
    </div>
  );
}
