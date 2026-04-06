const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userModel = require("../models/usermodel");
const {
  normalizeEmail,
  validateEmailWithAbstract,
} = require("../services/emailValidationService");

const authController = {
  register: async (req, res) => {
    try {
      const name = req.body.name?.trim();
      const email = normalizeEmail(req.body.email);
      const phone = req.body.phone?.trim() || "";
      const password = req.body.password?.trim();

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Name, email and password are required",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters",
        });
      }

      const validation = await validateEmailWithAbstract(email);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid email address",
          validation: {
            email: validation.email,
            isValid: validation.isValid,
            deliverability: validation.deliverability,
            suggestedCorrection: validation.suggestedCorrection,
          },
        });
      }

   

      

      const existingUser = await userModel.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await userModel.create({
        name,
        email,
        phone,
        password: hashedPassword,
      });

      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
        },
      });
    } catch (err) {
      const statusCode = err.statusCode || 500;

      return res.status(statusCode).json({
        success: false,
        message: err.message || "Server error",
        error: err.message,
      });
    }
  },

  login: async (req, res) => {
    try {
      const email = normalizeEmail(req.body.email);
      const password = req.body.password?.trim();

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const user = await userModel.findOne({ email });
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  },

  me: async (req, res) => {
    try {
      const user = await userModel.findById(req.user.userId).select("-password");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.status(200).json({
        success: true,
        user,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: err.message,
      });
    }
  },

  validateEmail: async (req, res) => {
    try {
      const validation = await validateEmailWithAbstract(req.body.email);

      return res.status(200).json({
        success: true,
        message: validation.isValid ? "Email is valid" : "Email validation failed",
        validation,
      });
    } catch (err) {
      const statusCode = err.statusCode || 500;

      return res.status(statusCode).json({
        success: false,
        message: err.message || "Email validation failed",
      });
    }
  },
};

module.exports = authController;
