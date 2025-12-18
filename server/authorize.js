const jwt = require('jsonwebtoken');

function authorize(allowedRoles = []) {
  return (req, res, next) => {
    try {
      const header = (req.headers.authorization || '').trim();
      const [scheme, token] = header.split(/\s+/);

      if (!/^Bearer$/i.test(scheme) || !token) {
        return res.status(401).json({ message: 'Token ausente' });
      }

      if (!process.env.JWT_SECRET) {
        // Evita errores silenciosos si falta la secret
        return res.status(500).json({ message: 'JWT_SECRET no configurado' });
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      // payload debería tener { id, email/username?, role | roles }
      req.user = payload;

      // Si no se restringe por rol, solo autenticación
      if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
        return next();
      }

      // Normalizamos a MAYÚSCULAS por consistencia
      const toUpper = v => (typeof v === 'string' ? v.toUpperCase() : v);

      const userRoles = Array.isArray(payload.roles)
        ? payload.roles.map(toUpper)
        : (payload.role ? [toUpper(payload.role)] : []);

      const needed = allowedRoles.map(toUpper);

      const ok = userRoles.some(r => needed.includes(r));
      if (!ok) return res.status(403).json({ message: 'Sin permisos' });

      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expirado' });
      }
      return res.status(401).json({ message: 'Token inválido' });
    }
  };
}

// Solo autenticación
const requireAuth = () => authorize();

// Requiere uno o más roles
const requireRole = (...roles) => authorize(roles);

// Exports
module.exports = authorize;
module.exports.requireAuth = requireAuth;
module.exports.requireRole = requireRole;
