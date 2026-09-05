
import { Search, User, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useGetEmployeesQuery } from "../../services/api/employees.api";
import { useGetAssetsQuery } from "../../services/api/asset.api";

// ============================================================
// TYPES
// ============================================================

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function CommandPalette({
  open,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  const navigate = useNavigate();

  // ==========================================================
  // EMPLOYEES
  // ==========================================================

  const {
    data: employeesResponse,
    isFetching: employeesLoading,
  } = useGetEmployeesQuery(
    query
      ? {
          search: query,
        }
      : undefined,
    {
      skip: !open,
    }
  );

  // ==========================================================
  // ASSETS
  // ==========================================================

  const {
    data: assetsResponse,
    isFetching: assetsLoading,
  } = useGetAssetsQuery(
    query
      ? {
          search: query,
          page: 1,
          pageSize: 10,
        }
      : undefined,
    {
      skip: !open,
    }
  );

  // ==========================================================
  // NORMALIZE EMPLOYEES RESPONSE
  // ==========================================================

  const employees = Array.isArray(employeesResponse)
    ? employeesResponse
    : employeesResponse?.data ?? [];

  // ==========================================================
  // NORMALIZE ASSETS RESPONSE
  // ==========================================================

  const assets = assetsResponse?.data ?? [];

  // ==========================================================
  // RESET SEARCH WHEN CLOSED
  // ==========================================================

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  // ==========================================================
  // ESCAPE KEY
  // ==========================================================

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const handleEmployeeClick = (employeeId: string) => {
    navigate(`/asset-manager?employee=${employeeId}`);
    onClose();
  };

  const handleAssetClick = (assetId: string) => {
    navigate(`/inventory?assetId=${assetId}`);
    onClose();
  };

  // ==========================================================
  // DON'T RENDER
  // ==========================================================

  if (!open) return null;

  const isLoading = employeesLoading || assetsLoading;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
      />

      {/* PALETTE */}
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        {/* SEARCH INPUT */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />

          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search employees or assets..."
            className="w-full text-sm outline-none placeholder:text-slate-400"
          />

          <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400">
            Esc
          </kbd>
        </div>

        {/* RESULTS */}
        <div className="max-h-80 overflow-y-auto p-2">
          {/* EMPTY SEARCH */}
          {query.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-400">
              Start typing to search across the workspace.
            </p>
          )}

          {/* LOADING */}
          {query.length > 0 && isLoading && (
            <div className="px-3 py-6 text-center text-sm text-slate-400">
              Searching...
            </div>
          )}

          {/* ==================================================
              EMPLOYEES
          ================================================== */}

          {query.length > 0 &&
            !employeesLoading &&
            employees.length > 0 && (
              <div className="mb-2">
                <p className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Employees
                </p>

                {employees.slice(0, 5).map((employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() =>
                      handleEmployeeClick(employee.id)
                    }
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
                  >
                    <User className="h-4 w-4 shrink-0 text-slate-400" />

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-800">
                        {employee.name ||
                          `${employee.firstName ?? ""} ${
                            employee.lastName ?? ""
                          }`.trim() ||
                          "Unnamed employee"}
                      </div>

                      {employee.department?.name && (
                        <div className="truncate text-xs text-slate-400">
                          {employee.department.name}
                        </div>
                      )}
                    </div>

                    {employee.employeeId && (
                      <span className="shrink-0 text-xs tabular-nums text-slate-400">
                        {employee.employeeId}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

          {/* ==================================================
              ASSETS
          ================================================== */}

          {query.length > 0 &&
            !assetsLoading &&
            assets.length > 0 && (
              <div>
                <p className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Assets
                </p>

                {assets.slice(0, 5).map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => handleAssetClick(asset.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
                  >
                    <Package className="h-4 w-4 shrink-0 text-slate-400" />

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-800">
                        {asset.name || "Unnamed asset"}
                      </div>

                      {asset.serialNumber && (
                        <div className="truncate text-xs text-slate-400">
                          Serial: {asset.serialNumber}
                        </div>
                      )}
                    </div>

                    {asset.assetTag && (
                      <span className="shrink-0 text-xs tabular-nums text-slate-400">
                        {asset.assetTag}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

          {/* ==================================================
              NO RESULTS
          ================================================== */}

          {query.length > 0 &&
            !isLoading &&
            employees.length === 0 &&
            assets.length === 0 && (
              <div className="px-3 py-8 text-center">
                <Search className="mx-auto mb-2 h-5 w-5 text-slate-300" />

                <p className="text-sm font-medium text-slate-600">
                  No results found
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Try searching for an employee, asset name, or asset tag.
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
