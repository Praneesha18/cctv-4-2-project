import React from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { clearAuthSession, getAuthUser, isAuthenticated } from "../lib/auth";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const authenticated = isAuthenticated();
  const user = getAuthUser();

  const baseLinkClasses =
    "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors";

  const navLinkClasses = ({ isActive }) =>
    [
      baseLinkClasses,
      isActive
        ? "bg-secondary text-[#D8F5C5]"
        : "text-white/72 hover:bg-white/6 hover:text-white",
    ].join(" ");

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 px-4 py-4 text-white sm:px-6 lg:px-8">
      <nav className="nav-shell mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 rounded-[24px] px-4 py-4 sm:px-5">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/6 text-sm font-bold text-[#D8F5C5]">
            CS
          </span>
          <div className="min-w-0">
            <h2 className="display-font text-lg font-semibold text-white">CCTV Secure</h2>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Smart video retrieval</p>
          </div>
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
          <NavLink to="/" className={navLinkClasses} end>
            Home
          </NavLink>
          {isLanding ? (
            <a
              href="#services"
              className={[baseLinkClasses, "text-white/72"].join(" ")}
            >
              Features
            </a>
          ) : (
            <Link
              to="/#services"
              className={[baseLinkClasses, "text-white/72"].join(" ")}
            >
              Features
            </Link>
          )}
          <NavLink to="/video-input" className={navLinkClasses}>
            Video Input
          </NavLink>
          {authenticated && (
            <>
              <NavLink to="/dashboard" className={navLinkClasses}>
                Dashboard
              </NavLink>
              <NavLink to="/history" className={navLinkClasses}>
                History
              </NavLink>
              <span className="max-w-[160px] px-3 py-2 text-right text-xs text-[#E3EBDD] text-wrap-balanced">
                {user?.name || user?.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white/82 transition-colors hover:bg-white/6 hover:text-white"
              >
                Logout
              </button>
            </>
          )}
          {!authenticated && (
            <>
              <NavLink to="/login" className={navLinkClasses}>
                Login
              </NavLink>
              <NavLink to="/register" className={navLinkClasses}>
                Register
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
