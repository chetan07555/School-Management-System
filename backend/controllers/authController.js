const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, class: studentClass } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ msg: "name, email, password, and role are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ msg: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role,
      class: studentClass || ""
    });

    res.status(201).json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        class: user.class
      }
    });
  } catch (error) {
    res.status(500).json({ msg: "Registration failed", error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: "email and password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ msg: "User not found" });

    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.status(400).json({ msg: "Wrong password" });

    res.json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        class: user.class
      }
    });
  } catch (error) {
    res.status(500).json({ msg: "Login failed", error: error.message });
  }
};

exports.me = async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      class: req.user.class
    }
  });
};