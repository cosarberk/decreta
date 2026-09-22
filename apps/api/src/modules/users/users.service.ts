import bcrypt from 'bcryptjs';
import { AppError } from '../../lib/index.js';
import { usersRepository, type PublicUser } from './users.repository.js';

const SALT_ROUNDS = 10;

export const usersService = {
  /** Parolayı özetler (yalnızca kayıt/oluşturma sırasında kullanılır). */
  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
  },

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  },

  async list(): Promise<PublicUser[]> {
    return usersRepository.list();
  },

  /** Yeni kullanıcı oluşturur; e-posta çakışmasını 409 ile bildirir. */
  async create(input: {
    email: string;
    password: string;
    fullName: string;
    role: 'admin' | 'user';
  }): Promise<PublicUser> {
    const existing = await usersRepository.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict('Bu e-posta ile zaten bir kullanıcı var', 'EMAIL_TAKEN');
    }
    const passwordHash = await this.hashPassword(input.password);
    return usersRepository.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: input.role,
    });
  },

  async setActive(id: string, isActive: boolean): Promise<PublicUser> {
    if (!isActive) {
      await this.assertNotLastAdmin(id);
    }
    const user = await usersRepository.setActive(id, isActive);
    if (!user) throw AppError.notFound('Kullanıcı bulunamadı');
    return user;
  },

  async setRole(id: string, role: 'admin' | 'user'): Promise<PublicUser> {
    if (role === 'user') {
      await this.assertNotLastAdmin(id);
    }
    const user = await usersRepository.setRole(id, role);
    if (!user) throw AppError.notFound('Kullanıcı bulunamadı');
    return user;
  },

  /**
   * Sistemde en az bir aktif admin kalmasını güvence altına alır; son admini
   * pasifleştirme/rol düşürme girişimini engeller.
   */
  async assertNotLastAdmin(userId: string): Promise<void> {
    const target = await usersRepository.findById(userId);
    if (target?.role !== 'admin') return;
    const adminCount = await usersRepository.countAdmins();
    if (adminCount <= 1) {
      throw AppError.badRequest('Sistemdeki son yönetici pasifleştirilemez', 'LAST_ADMIN');
    }
  },
};
