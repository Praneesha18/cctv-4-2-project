import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../lib/api";

const Registration = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isForgotMode = searchParams.get("mode") === "forgot";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [forgotEmail, setForgotEmail] = useState("");

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateRegister = () => {
    const newErrors = {};
    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedPassword = formData.password.trim();

    if (!trimmedName) newErrors.name = "Name is required";
    if (!trimmedEmail) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      newErrors.email = "Enter a valid email";
    }
    if (trimmedPhone && !/^[0-9+\-\s()]{7,}$/.test(trimmedPhone)) {
      newErrors.phone = "Enter a valid phone number";
    }
    if (!trimmedPassword) {
      newErrors.password = "Password is required";
    } else if (trimmedPassword.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForgot = () => {
    const newErrors = {};

    if (!forgotEmail.trim()) newErrors.forgotEmail = "Email is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!validateRegister()) {
      setSuccess("");
      return;
    }

    setIsSubmitting(true);
    setServerError("");

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password.trim(),
      };

      const data = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess(data.message || "Registration completed successfully");
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
      });
      setErrors({});
      window.setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      setServerError(err.message || "Registration failed");
      setSuccess("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();

    if (validateForgot()) {
      setSuccess("Password reset link sent successfully!");
      setForgotEmail("");
      setErrors({});
    } else {
      setSuccess("");
    }
  };

  const switchToForgot = () => {
    setErrors({});
    setSuccess("");
    setServerError("");
    setSearchParams({ mode: "forgot" });
  };

  const switchToRegister = () => {
    setErrors({});
    setSuccess("");
    setServerError("");
    setSearchParams({});
  };

  return (
    <div className="min-h-screen page-background">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <form
          className="w-full max-w-md rounded-[28px] border border-[#7DDE86]/30 bg-[#08130D]/65 p-8 text-white shadow-[0_0_50px_rgba(73,255,133,0.16)] backdrop-blur-md"
          onSubmit={isForgotMode ? handleForgotSubmit : handleRegisterSubmit}
        >
          <h1 className="text-center text-xl font-bold tracking-wide text-[#7DDE86] sm:text-2xl">
            Post-Event Video Analysis and Retrieval Using Multimodal AI
          </h1>
          <h2 className="mt-1 text-center text-3xl font-semibold text-white/95">
            {isForgotMode ? "Forgot Password" : "Create Account"}
          </h2>
          <div className="mx-auto mt-5 h-[2px] w-56 bg-gradient-to-r from-transparent via-[#7DDE86] to-transparent" />

          {isForgotMode ? (
            <div className="mt-8">
              <label htmlFor="forgotEmail" className="mb-2 block text-base font-medium text-[#DFFFE2]">
                Email
              </label>
              <input
                id="forgotEmail"
                type="email"
                name="forgotEmail"
                placeholder="Enter your email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full rounded-2xl border border-[#7DDE86]/30 bg-[#0B1911]/70 px-5 py-3 text-base text-white outline-none placeholder:text-white/40 focus:border-[#7DDE86] focus:ring-2 focus:ring-[#7DDE86]/35"
              />
              {errors.forgotEmail && (
                <div className="mt-2 text-sm font-medium text-red-300">{errors.forgotEmail}</div>
              )}
            </div>
          ) : (
            <div className="mt-8 space-y-5">
              <div>
                <label htmlFor="name" className="mb-2 block text-base font-medium text-[#DFFFE2]">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-[#7DDE86]/30 bg-[#0B1911]/70 px-5 py-3 text-base text-white outline-none placeholder:text-white/40 focus:border-[#7DDE86] focus:ring-2 focus:ring-[#7DDE86]/35"
                />
                {errors.name && <div className="mt-2 text-sm font-medium text-red-300">{errors.name}</div>}
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-base font-medium text-[#DFFFE2]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-[#7DDE86]/30 bg-[#0B1911]/70 px-5 py-3 text-base text-white outline-none placeholder:text-white/40 focus:border-[#7DDE86] focus:ring-2 focus:ring-[#7DDE86]/35"
                />
                {errors.email && <div className="mt-2 text-sm font-medium text-red-300">{errors.email}</div>}
              </div>

              <div>
                <label htmlFor="phone" className="mb-2 block text-base font-medium text-[#DFFFE2]">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-[#7DDE86]/30 bg-[#0B1911]/70 px-5 py-3 text-base text-white outline-none placeholder:text-white/40 focus:border-[#7DDE86] focus:ring-2 focus:ring-[#7DDE86]/35"
                />
                {errors.phone && <div className="mt-2 text-sm font-medium text-red-300">{errors.phone}</div>}
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-base font-medium text-[#DFFFE2]">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-[#7DDE86]/30 bg-[#0B1911]/70 px-5 py-3 text-base text-white outline-none placeholder:text-white/40 focus:border-[#7DDE86] focus:ring-2 focus:ring-[#7DDE86]/35"
                />
                {errors.password && (
                  <div className="mt-2 text-sm font-medium text-red-300">{errors.password}</div>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting && !isForgotMode}
            className={`mt-7 w-full rounded-2xl border px-4 py-3 text-2xl font-semibold text-white transition ${
              isForgotMode
                ? "border-[#67C873]/40 bg-gradient-to-r from-[#23672D] to-[#379446] shadow-[0_0_14px_rgba(82,196,108,0.22)] hover:brightness-105"
                : "border-[#7DDE86]/45 bg-gradient-to-r from-[#2B7D37] to-[#4BB85B] shadow-[0_0_24px_rgba(98,255,152,0.35)] hover:brightness-110"
            }`}
          >
            {isForgotMode ? "Send Reset Link" : isSubmitting ? "Registering..." : "Register"}
          </button>

          {success && (
            <div className="mt-4 text-center text-sm font-semibold text-[#B7FFC1]">{success}</div>
          )}

          {serverError && (
            <div className="mt-4 text-center text-sm font-semibold text-red-300">{serverError}</div>
          )}

          <div className="mt-8 border-t border-[#7DDE86]/20 pt-6 text-center text-lg text-white/90">
            {isForgotMode ? (
              <>
                Need an account?{" "}
                <button
                  type="button"
                  onClick={switchToRegister}
                  className="font-semibold text-[#9DFFAB] underline underline-offset-4 transition hover:text-[#C7FFCF]"
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Forgot your password?{" "}
                <button
                  type="button"
                  onClick={switchToForgot}
                  className="font-semibold text-[#9DFFAB] underline underline-offset-4 transition hover:text-[#C7FFCF]"
                >
                  Reset here
                </button>
              </>
            )}
          </div>

          <div className="mt-4 text-center text-lg text-white/90">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-[#9DFFAB] underline underline-offset-4 transition hover:text-[#C7FFCF]"
            >
              Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Registration;
