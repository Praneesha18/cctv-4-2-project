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
    setServerError("");
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    if (errors[e.target.name]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [e.target.name]: "",
      }));
    }
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
    setErrors((currentErrors) => ({
      ...currentErrors,
      email: "",
    }));

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
      const validation = err.data?.validation;
      if (err.status === 400 && validation?.email && validation?.isValid === false) {
        setErrors((currentErrors) => ({
          ...currentErrors,
          email:
            validation.suggestedCorrection
              ? `Invalid email address. Did you mean ${validation.suggestedCorrection}?`
              : "Invalid email address",
        }));
        setServerError("");
      } else {
        setServerError(err.message || "Registration failed");
      }
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
    <div className="page-background h-[calc(100vh-72px)] overflow-hidden">
      <div className="mx-auto flex h-full max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="auth-shell w-full">
          <section className="auth-shell-card auth-shell-card-no-orb px-2 py-4 sm:px-4 lg:px-6">
            <p className="eyebrow">{isForgotMode ? "Account Recovery" : "Create Account"}</p>
            <h1 className="display-font mt-5 max-w-3xl text-4xl font-semibold leading-tight text-[#F7F4EB] sm:text-5xl">
              {isForgotMode
                ? "Get back into your account and continue where you left off."
                : "Create your account and start using the workspace easily."}
            </h1>
            <p className="body-copy mt-5 max-w-2xl text-base sm:text-lg">
              {isForgotMode
                ? "Enter the email linked to your account and continue your workflow without extra steps."
                : "Set up your account to upload footage, review results, and keep everything organized in one place."}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="panel-card rounded-[16px] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/44">
                  Get Started
                </p>
                <p className="display-font mt-3 text-2xl font-semibold text-[#F7F4EB]">
                  Create your account and begin with a clean setup 
                </p>
              </div>
              <div className="rounded-[16px] bg-secondary p-5 text-[#F8F3E9]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgba(248,243,233,0.56)]">
                  Simple Access
                </p>
                <p className="display-font mt-3 text-2xl font-semibold">
                  Sign up once and keep your work in one place smoothly and efficiently
                </p>
              </div>
            </div>
          </section>

          <form
            className="rounded-[22px] bg-deep p-7 text-white sm:p-8"
            onSubmit={isForgotMode ? handleForgotSubmit : handleRegisterSubmit}
          >
            {isForgotMode ? (
              <div>
                <label
                  htmlFor="forgotEmail"
                  className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/58"
                >
                  Email
                </label>
                <input
                  id="forgotEmail"
                  type="email"
                  name="forgotEmail"
                  placeholder="name@domain.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="app-input"
                />
                {errors.forgotEmail && (
                  <div className="mt-2 text-sm font-medium text-red-300">{errors.forgotEmail}</div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/58"
                  >
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleChange}
                    className="app-input"
                  />
                  {errors.name && <div className="mt-2 text-sm font-medium text-red-300">{errors.name}</div>}
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/58"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="name@domain.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="app-input"
                  />
                  {errors.email && <div className="mt-2 text-sm font-medium text-red-300">{errors.email}</div>}
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/58"
                  >
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    className="app-input"
                  />
                  {errors.phone && <div className="mt-2 text-sm font-medium text-red-300">{errors.phone}</div>}
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/58"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleChange}
                    className="app-input"
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
              className="app-button auth-submit-button mt-6 w-full"
            >
              {isForgotMode ? "Send Reset Link" : isSubmitting ? "Registering..." : "Register"}
            </button>

            {success && (
              <div className="mt-4 text-center text-sm font-semibold text-[#D9EBCF]">{success}</div>
            )}

            {serverError && (
              <div className="mt-4 text-center text-sm font-semibold text-red-300">{serverError}</div>
            )}

            <div className="mt-6 pt-4 text-center text-sm text-white/72">
              {isForgotMode ? (
                <>
                  Need an account?{" "}
                  <button
                    type="button"
                    onClick={switchToRegister}
                    className="font-semibold text-[#9DFFAB] underline underline-offset-4"
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
                    className="font-semibold text-[#9DFFAB] underline underline-offset-4"
                  >
                    Reset here
                  </button>
                </>
              )}
            </div>

            <div className="mt-3 text-center text-sm text-white/72">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-[#9DFFAB] underline underline-offset-4"
              >
                Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Registration;
