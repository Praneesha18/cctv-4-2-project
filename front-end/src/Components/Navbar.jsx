import React from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();
  const isLanding = location.pathname === "/";

  const linkClasses =
    "text-sm font-medium text-white/90 transition hover:text-[#8BAE66]";

  return (
    <header className="bg-[#1B211A] text-white shadow-sm">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold tracking-wide text-[#8BAE66]">CCTV Secure</h2>

        <div className="flex items-center gap-5 sm:gap-6">
          <Link to="/" className={linkClasses}>
            Home
          </Link>
          {isLanding ? (
            <a href="#services" className={linkClasses}>
              Services
            </a>
          ) : (
            <Link to="/#services" className={linkClasses}>
              Services
            </Link>
          )}
          <Link to="/video-input" className={linkClasses}>
            Video Input
          </Link>
          <Link to="/login" className={linkClasses}>
            Login
          </Link>
          <Link to="/register" className={linkClasses}>
            Register
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
