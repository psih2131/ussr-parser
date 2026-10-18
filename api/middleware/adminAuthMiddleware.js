import UserService from '../services/UserService.js';

const COOKIE_NAME = 'admin_session';
const userService = new UserService();

async function adminAuthMiddleware(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    const { session, admin } = await userService.getSession(token);

    req.admin = admin;
    req.adminSession = session;

    return next();
  } catch (error) {
    return next(error);
  }
}

export default adminAuthMiddleware;
