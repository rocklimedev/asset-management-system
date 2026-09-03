
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">

        {/* Left Branding Panel */}
        <div className="hidden w-1/2 bg-slate-900 lg:flex">
          <div className="flex w-full flex-col justify-between p-10 text-white">
            
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-900">
                  IT
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    IT Management
                  </p>
                  <p className="text-xs text-slate-400">
                    Administration Portal
                  </p>
                </div>
              </div>
            </div>

            {/* Main Message */}
            <div className="max-w-md">
              <h1 className="text-4xl font-semibold tracking-tight">
                Manage your IT operations from one place.
              </h1>

              <p className="mt-4 text-sm leading-6 text-slate-400">
                Securely manage users, inventory, assets, access,
                requests and IT operations through a centralized
                management system.
              </p>
            </div>

            {/* Footer */}
            <div>
              <p className="text-xs text-slate-500">
                © {new Date().getFullYear()} IT Management System
              </p>
            </div>
          </div>
        </div>

        {/* Authentication Content */}
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>

      </div>
    </div>
  );
}

