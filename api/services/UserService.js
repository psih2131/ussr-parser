import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import ApiErrors from '../exeptions/apiErrors.js';
import UserRepository from '../../repositories/user/user.js';
import AuthRepository from '../../repositories/user/auth.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

class AuthService {
  constructor() {
    this.userRepository = new UserRepository();
    this.authRepository = new AuthRepository();
  }

  #createToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  #buildExpiresAt() {
    return new Date(Date.now() + SESSION_TTL_MS);
  }

  #publicAdmin(admin) {
    return {
      id: admin.admin_id ?? admin.admin_pk ?? admin.id,
      name: admin.name || admin.admin_name || null,
      login: admin.login || admin.admin_login,
      email: admin.email || admin.admin_email || null,
    };
  }

  async register(email, password) {
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const user = await this.userRepository.getUserByEmail(email);
      if (user) {
        throw ApiErrors.BadRequest('User already exists');
      }
      const newUser = await this.userRepository.createUser(email, passwordHash);
      return newUser;
    } catch (error) {
      if (error instanceof ApiErrors) throw error;
      console.error(error);
      throw ApiErrors.BadRequest('Error registering user');
    }
  }

  async login(login, password) {
    if (!login || !password) {
      throw ApiErrors.BadRequest('Логин и пароль обязательны');
    }

    const admin = await this.userRepository.findAdminByLogin(String(login).trim());
    if (!admin) {
      throw ApiErrors.BadRequest('Пользователь не найден');
    }

    const isValidPassword = await bcrypt.compare(String(password), admin.password_hash);
    if (!isValidPassword) {
      throw ApiErrors.BadRequest('Invalid password');
    }

    const token = this.#createToken();
    const expiresAt = this.#buildExpiresAt();

    await this.authRepository.createSession({
      adminId: admin.id,
      token,
      expiresAt,
    });

    return {
      token,
      expiresAt,
      admin: this.#publicAdmin(admin),
    };
  }

  async logout(token) {
    if (!token) {
      return true;
    }

    await this.authRepository.deleteByToken(token);
    return true;
  }

  async getSession(token) {
    if (!token) {
      throw ApiErrors.UnauthorizedError();
    }

    const session = await this.authRepository.findValidByToken(token);
    if (!session) {
      throw ApiErrors.UnauthorizedError();
    }

    return {
      session: {
        id: session.id,
        token: session.token,
        expiresAt: session.expires_at,
      },
      admin: this.#publicAdmin(session),
    };
  }

  async me(token) {
    const { admin } = await this.getSession(token);
    return admin;
  }
}

export default AuthService;
