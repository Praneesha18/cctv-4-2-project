import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { setAuthSession } from "../lib/auth";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      setSuccess("");
      return;
    }

    setIsSubmitting(true);
    setServerError("");

    try {
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      setAuthSession(data.token, data.user);
      setSuccess(data.message || "Welcome back!");
      setErrors({});
      setFormData({ email: "", password: "" });
      navigate("/dashboard");
    } catch (err) {
      setServerError(err.message || "Unable to sign in. Please try again.");
      setSuccess("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-background h-[calc(100vh-72px)] overflow-hidden">
      <div className="mx-auto flex h-full max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="auth-shell w-full">
          <section className="auth-shell-card auth-shell-card-no-orb flex h-full flex-col justify-center px-2 py-4 sm:px-4 lg:px-6">
            <p className="eyebrow">Welcome Back</p>
            <h1 className="display-font mt-5 max-w-3xl text-4xl font-semibold leading-tight text-[#F7F4EB] sm:text-5xl">
              Welcome back! Sign in to continue your work smoothly.
            </h1>
            <p className="body-copy mt-5 max-w-2xl text-base sm:text-lg">
              Access your uploads, review results, and continue your video search workflow from one simple and organized space.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="panel-card rounded-[16px] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/44">
                  Stay Organized
                </p>
                <p className="display-font mt-3 text-2xl font-semibold text-[#F7F4EB]">
                  Keep your searches, uploads, and results neatly in one place
                </p>
              </div>
              <div className="rounded-[16px] bg-secondary p-5 text-[#F8F3E9]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgba(248,243,233,0.56)]">
                  Smooth Experience
                </p>
                <p className="display-font mt-3 text-2xl font-semibold">
                  Fast access with a simple and secure login experience
                </p>
              </div>
            </div>
          </section>

          <form
            className="flex h-full flex-col justify-center rounded-[22px] bg-deep p-7 text-white sm:p-8"
            onSubmit={handleSubmit}
          >
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/70"
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
                {errors.email && (
                  <div className="mt-2 text-sm font-medium text-red-300">{errors.email}</div>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/70"
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
                  className="app-input"
                />
                {errors.password && (
                  <div className="mt-2 text-sm font-medium text-red-300">{errors.password}</div>
                )}
              </div>
            </div>

            <div className="mt-4 text-right">
              <Link
                to="/register?mode=forgot"
                className="text-sm font-semibold text-[#9DFFAB] underline underline-offset-4"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="app-button auth-submit-button mt-6 w-full"
            >
              {isSubmitting ? "Signing you in..." : "Sign In"}
            </button>

            {success && (
              <div className="mt-4 text-center text-sm font-semibold text-[#D9EBCF]">
                {success}
              </div>
            )}

            {serverError && (
              <div className="mt-4 text-center text-sm font-semibold text-red-300">
                {serverError}
              </div>
            )}

            <div className="mt-6 pt-4 text-center text-sm text-white/72">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-[#9DFFAB] underline underline-offset-4"
              >
                Register
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
