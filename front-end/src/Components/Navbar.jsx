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
    "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-semibold";

  const navLinkClasses = ({ isActive }) =>
    [
      baseLinkClasses,
      isActive
        ? "bg-secondary text-[#D8F5C5]"
        : "text-white/72",
    ].join(" ");

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 bg-[rgba(6,16,11,0.78)] text-white backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/6 text-sm font-bold text-[#D8F5C5]">
            CS
          </span>
          <div>
            <h2 className="display-font text-lg font-semibold text-white">CCTV Secure</h2>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">Smart video retrieval</p>
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
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
              <span className="px-3 py-2 text-xs text-[#E3EBDD]">
                {user?.name || user?.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center px-3 py-2 text-sm font-semibold text-white/82"
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
