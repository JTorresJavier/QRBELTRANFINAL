const jwt = require('jsonwebtoken');

/**
 * authorize([roles]) valida JWT (Authorization: Bearer <token>)
 * y opcionalmente restringe por rol.
 *
 * Ejemplos:
 *   app.get('/api/privado', authorize(), handler);
 *   app.get('/api/admin',   authorize(['admin']), handler);
 */
function authorize(allowedRoles = []) {
  return (req, res, next) => {
    try {
      const header = req.headers.authorization || '';
      const [scheme, token] = header.split(' ');

      if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ message: 'Token ausente' });
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload; // { id, username, role/roles }

      if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
        return next(); // solo autenticación
      }

      const userRoles = Array.isArray(payload.roles)
        ? payload.roles
        : (payload.role ? [payload.role] : []);

      const ok = userRoles.some(r => allowedRoles.includes(r));
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

const requireAuth = () => authorize();

module.exports = authorize;
module.exports.requireAuth = requireAuth;
