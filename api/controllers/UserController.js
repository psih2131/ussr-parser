import UserService from '../services/UserService.js';
import ApiErrors from '../exeptions/apiErrors.js';

const COOKIE_NAME = 'admin_session';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

class UserController {
  constructor() {
    this.UserService = new UserService();
  }

  #cookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE_MS,
    };
  }

  async register(req, res, next) {
    try {
      const { email, password, secretRegisterKey } = req.body;

      if (secretRegisterKey !== process.env.REGISTER_SECRET_KEY) {
        throw ApiErrors.BadRequest('Invalid secret register key');
      }

      await this.UserService.register(email, password);

      return res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { login, password } = req.body;
      const result = await this.UserService.login(login, password);

      res.cookie(COOKIE_NAME, result.token, this.#cookieOptions());

      return res.status(200).json({
        success: true,
        data: {
          admin: result.admin,
          expiresAt: result.expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      await this.UserService.logout(token);

      res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async me(req, res, next) {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      const admin = await this.UserService.me(token);

      return res.status(200).json({
        success: true,
        data: { admin },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default UserController;
