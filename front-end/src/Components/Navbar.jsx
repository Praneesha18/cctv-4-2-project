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
    "rounded-full px-3 py-2 text-sm font-semibold transition";

  const navLinkClasses = ({ isActive }) =>
    [
      baseLinkClasses,
      isActive
        ? "bg-[#8BAE66] text-[#0B140C] shadow-[0_10px_24px_rgba(139,174,102,0.25)]"
        : "text-white/82 hover:bg-white/6 hover:text-[#D8F5C5]",
    ].join(" ");

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[rgba(12,20,13,0.88)] text-white shadow-sm backdrop-blur-xl">
      <nav className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#92D178,#315D39)] text-lg font-bold text-[#071009]">
            CS
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-[0.08em] text-[#D8F5C5]">CCTV Secure</h2>
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">Smart video retrieval</p>
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <NavLink to="/" className={navLinkClasses} end>
            Home
          </NavLink>
          {isLanding ? (
            <a href="#services" className={[baseLinkClasses, "text-white/82 hover:bg-white/6 hover:text-[#D8F5C5]"].join(" ")}>
              Features
            </a>
          ) : (
            <Link to="/#services" className={[baseLinkClasses, "text-white/82 hover:bg-white/6 hover:text-[#D8F5C5]"].join(" ")}>
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
              <span className="rounded-full border border-[#86F5A8]/20 bg-white/5 px-3 py-2 text-xs text-[#D8F5C5]">
                {user?.name || user?.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-white/12 px-3 py-2 text-sm font-medium text-white/82 transition hover:bg-white/6 hover:text-[#D8F5C5]"
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
