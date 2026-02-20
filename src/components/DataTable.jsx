import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

function DataTable({
  columns,
  data,
  loading,
  searchValue,
  onSearchChange,
  sorting,
  onSortingChange,
  pageIndex,
  pageSize,
  totalPages,
  total,
  onPageChange,
  onPageSizeChange,
  emptyMessage = "No records found.",
  tableMinWidthClass = "min-w-full",
}) {
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    onSortingChange,
    manualSorting: true,
    manualPagination: true,
    pageCount: totalPages,
    getCoreRowModel: getCoreRowModel(),
  });

  function getSortIndicator(column) {
    const sort = column.getIsSorted();
    if (sort === "asc") return " ?";
    if (sort === "desc") return " ?";
    return "";
  }

  const rows = table.getRowModel().rows;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          className="form-input sm:max-w-xs"
          placeholder="Search..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
        />

        <div className="flex items-center gap-2 text-sm">
          <span className="muted-text">Rows</span>
          <select
            className="form-input w-24 py-2"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {[5, 10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className={`w-full ${tableMinWidthClass} border-collapse text-sm`}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border text-left">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <th key={header.id} className="whitespace-nowrap px-3 py-2.5">
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className={canSort ? "font-medium hover:underline" : "font-medium"}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort ? getSortIndicator(header.column) : ""}
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-2 py-4 muted-text">
                  {emptyMessage}
                </td>
              </tr>
            ) : null}

            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/70 align-top">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {!loading && rows.length === 0 ? <p className="muted-text">{emptyMessage}</p> : null}

        {rows.map((row) => {
          const cells = row.getVisibleCells();
          return (
            <div key={row.id} className="rounded-lg border border-border bg-surface p-3">
              <div className="space-y-2">
                {cells
                  .filter((cell) => cell.column.id !== "actions")
                  .map((cell) => (
                    <div key={cell.id} className="flex items-start justify-between gap-2">
                      <span className="text-xs muted-text">
                        {flexRender(cell.column.columnDef.header, cell.getContext())}
                      </span>
                      <span className="text-right text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </span>
                    </div>
                  ))}
              </div>

              {cells.some((cell) => cell.column.id === "actions") ? (
                <div className="mt-3 border-t border-border pt-3">
                  {cells
                    .filter((cell) => cell.column.id === "actions")
                    .map((cell) => (
                      <div key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                    ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm muted-text">Total: {total}</p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="ghost-btn"
            disabled={pageIndex <= 0}
            onClick={() => onPageChange(Math.max(0, pageIndex - 1))}
          >
            Prev
          </button>
          <span className="text-sm muted-text">
            Page {totalPages === 0 ? 0 : pageIndex + 1} of {totalPages}
          </span>
          <button
            type="button"
            className="ghost-btn"
            disabled={pageIndex + 1 >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages - 1, pageIndex + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
