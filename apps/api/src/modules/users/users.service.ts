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
   * "Bulunabilirlik" bayrağını değiştirir. Açıkken kullanıcı, kayıt formundaki
   * karar veren/şahit önerilerinde persons ile birlikte listelenir. persons
   * tablosuna kopya yazılmaz; öneri birleşimde hesaplanır (FK/silme derdi yok).
   */
  async setAvailability(id: string, value: boolean): Promise<PublicUser> {
    const user = await usersRepository.setAvailableAsPerson(id, value);
    if (!user) throw AppError.notFound('Kullanıcı bulunamadı');
    return user;
  },

  /** Admin bir kullanıcının adını günceller. */
  async updateName(id: string, fullName: string): Promise<PublicUser> {
    const trimmed = fullName.trim();
    if (trimmed.length === 0) throw AppError.badRequest('İsim soyisim zorunlu');
    const user = await usersRepository.updateFullName(id, trimmed);
    if (!user) throw AppError.notFound('Kullanıcı bulunamadı');
    return user;
  },

  /** Admin: isim + e-postayı günceller (e-posta çakışması 409). */
  async adminUpdate(id: string, fullName: string, email: string): Promise<PublicUser> {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedName.length === 0) throw AppError.badRequest('İsim soyisim zorunlu');
    const dup = await usersRepository.findByEmail(trimmedEmail);
    if (dup && dup.id !== id) {
      throw AppError.conflict('Bu e-posta başka bir kullanıcıda', 'EMAIL_TAKEN');
    }
    const user = await usersRepository.updateProfile(id, trimmedName, trimmedEmail);
    if (!user) throw AppError.notFound('Kullanıcı bulunamadı');
    return user;
  },

  /** Admin: kullanıcının parolasını doğrudan belirler (mail sunucusu olmayanlar için). */
  async adminSetPassword(id: string, newPassword: string): Promise<void> {
    const user = await usersRepository.findById(id);
    if (!user) throw AppError.notFound('Kullanıcı bulunamadı');
    const hash = await this.hashPassword(newPassword);
    await usersRepository.updatePassword(id, hash);
  },

  /**
   * Kullanıcıyı siler. Kayıt açmış kullanıcılar (iz bütünlüğü için) ve son admin
   * silinemez; bunun yerine pasifleştirilmeleri önerilir.
   */
  async remove(id: string): Promise<PublicUser> {
    const user = await usersRepository.findById(id);
    if (!user) throw AppError.notFound('Kullanıcı bulunamadı');
    await this.assertNotLastAdmin(id);
    const authored = await usersRepository.countAuthoredRecords(id);
    if (authored > 0) {
      throw AppError.conflict(
        `Bu kullanıcı ${authored} kayıt açmış; iz bütünlüğü için silinemez. Pasifleştirebilirsiniz.`,
        'USER_HAS_RECORDS',
      );
    }
    await usersRepository.remove(id);
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
