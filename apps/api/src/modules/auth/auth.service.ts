import { config } from '../../config/index.js';
import { AppError } from '../../lib/index.js';
import { usersRepository, usersService, type PublicUser } from '../users/index.js';
import type { AuthUser } from '../../types/fastify.js';

export const authService = {
  /**
   * E-posta/parola doğrular. Başarılıysa JWT'ye konacak kimliği döndürür;
   * hatalı bilgi ya da pasif hesapta 401 fırlatır.
   */
  async validateCredentials(email: string, password: string): Promise<AuthUser> {
    const user = await usersRepository.findByEmail(email);
    if (!user || !user.is_active) {
      throw AppError.unauthorized('E-posta veya parola hatalı');
    }
    const ok = await usersService.verifyPassword(password, user.password_hash);
    if (!ok) {
      throw AppError.unauthorized('E-posta veya parola hatalı');
    }
    return {
      sub: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
    };
  },

  /** Oturum sahibinin güncel (DB'den taze) profilini döndürür. */
  async currentUser(userId: string): Promise<PublicUser> {
    const user = await usersRepository.findById(userId);
    if (!user || !user.is_active) {
      throw AppError.unauthorized('Hesap bulunamadı veya pasif');
    }
    return user;
  },

  /**
   * Yapılandırmada tanımlıysa ve sistemde hiç aktif admin yoksa ilk yönetici
   * hesabını oluşturur. İlk kurulumda sisteme giriş yapılabilmesini sağlar.
   */
  async ensureBootstrapAdmin(): Promise<void> {
    const seed = config.bootstrapAdmin;
    if (!seed) return;
    if ((await usersRepository.countAdmins()) > 0) return;
    const existing = await usersRepository.findByEmail(seed.email);
    if (existing) return;
    await usersService.create({
      email: seed.email,
      password: seed.password,
      fullName: seed.fullName,
      role: 'admin',
    });
  },
};
