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
      setSuccess(data.message || "Login successful");
      setErrors({});
      setFormData({ email: "", password: "" });
      navigate("/dashboard");
    } catch (err) {
      setServerError(err.message || "Login failed");
      setSuccess("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen page-background">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <form
          className="surface-card w-full max-w-md rounded-[28px] p-8 text-white"
          onSubmit={handleSubmit}
        >
          <h1 className="display-font text-center text-xl font-bold tracking-wide text-[#7DDE86] sm:text-2xl">
            Post-Event Video Analysis and Retrieval Using Multimodal AI
          </h1>
          <h2 className="display-font mt-1 text-center text-3xl font-semibold text-white/95">
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
                className="app-input text-lg"
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
                className="app-input text-lg"
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
            disabled={isSubmitting}
            className="app-button app-button-primary mt-7 w-full text-2xl disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>

          {success && (
            <div className="mt-4 text-center text-lg font-semibold text-[#B7FFC1]">
              {success}
            </div>
          )}

          {serverError && (
            <div className="mt-4 text-center text-lg font-semibold text-red-300">
              {serverError}
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
