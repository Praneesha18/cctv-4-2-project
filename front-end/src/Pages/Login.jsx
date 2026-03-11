import React, { useState } from "react";
import { Link } from "react-router-dom";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validate()) {
      setSuccess("Login Successful!");
      setErrors({});
    } else {
      setSuccess("");
    }
  };

  return (
    <div className="min-h-screen page-background">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <form
          className="w-full max-w-md rounded-[28px] border border-[#7DDE86]/30 bg-[#08130D]/65 p-8 text-white shadow-[0_0_50px_rgba(73,255,133,0.16)] backdrop-blur-md"
          onSubmit={handleSubmit}
        >
          <h1 className="text-center text-xl font-bold tracking-wide text-[#7DDE86] sm:text-2xl">
            Post-Event Video Analysis and Retrieval Using Multimodal AI
          </h1>
          <h2 className="mt-1 text-center text-3xl font-semibold text-white/95">
            Login
          </h2>
          <div className="mx-auto mt-5 h-[2px] w-56 bg-gradient-to-r from-transparent via-[#7DDE86] to-transparent" />

          <div className="mt-8 space-y-6">
            <div>
              <label
                htmlFor="email"
                className="mb-2 flex items-center gap-2 text-xl font-medium text-[#DFFFE2]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#7DDE86]/30 bg-[#0B1911]/70 px-5 py-3 text-lg text-white outline-none placeholder:text-white/40 focus:border-[#7DDE86] focus:ring-2 focus:ring-[#7DDE86]/35"
              />
              {errors.email && (
                <div className="mt-2 text-lg font-medium text-red-300">{errors.email}</div>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 flex items-center gap-2 text-xl font-medium text-[#DFFFE2]"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-2xl border border-[#7DDE86]/30 bg-[#0B1911]/70 px-5 py-3 text-lg text-white outline-none placeholder:text-white/40 focus:border-[#7DDE86] focus:ring-2 focus:ring-[#7DDE86]/35"
              />
              {errors.password && (
                <div className="mt-2 text-lg font-medium text-red-300">{errors.password}</div>
              )}
            </div>
          </div>

          <div className="mt-4 text-right">
            <Link
              to="/register?mode=forgot"
              className="text-lg font-medium text-[#9DFFAB] underline underline-offset-4 transition hover:text-[#C7FFCF]"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            className="mt-7 w-full rounded-2xl border border-[#7DDE86]/45 bg-gradient-to-r from-[#2B7D37] to-[#4BB85B] px-4 py-3 text-2xl font-semibold text-white shadow-[0_0_24px_rgba(98,255,152,0.35)] transition hover:brightness-110"
          >
            Login
          </button>

          {success && (
            <div className="mt-4 text-center text-lg font-semibold text-[#B7FFC1]">
              {success}
            </div>
          )}

          <div className="mt-8 border-t border-[#7DDE86]/20 pt-6 text-center text-lg text-white/90">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-[#9DFFAB] underline underline-offset-4 transition hover:text-[#C7FFCF]"
            >
              Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;


