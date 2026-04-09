// Role-based middleware to check user permissions
const roleMiddleware = (requiredRoles) => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: No user found" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Required role ${roles.join(", ")}, but user has '${req.user.role}'`
      });
    }

    next();
  };
};

module.exports = roleMiddleware;
