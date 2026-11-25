import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { hashPassword } from './auth/password';
import { parseEnv } from './env';
import { PrismaService } from './prisma.service';
import {
  DEFAULT_MENU,
  DEFAULT_RESTAURANT_ID,
  DEFAULT_RESTAURANT_NAME,
  PLATFORM_RESTAURANT_ID,
  PLATFORM_RESTAURANT_NAME,
} from './restaurant/default-restaurant';

/** Garante o restaurante padrão, o cardápio inicial e o primeiro gerente (via variáveis de ambiente). */
@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureRestaurant();
    await this.ensureFirstManager();
    await this.ensurePlatformRestaurant();
    await this.ensureSuperAdmin();
  }

  private async ensureRestaurant(): Promise<void> {
    const existing = await this.prisma.restaurant.findUnique({
      where: { id: DEFAULT_RESTAURANT_ID },
    });
    if (existing) return;
    await this.prisma.restaurant.create({
      data: {
        id: DEFAULT_RESTAURANT_ID,
        name: DEFAULT_RESTAURANT_NAME,
        menuItems: { create: DEFAULT_MENU.map((item) => ({ ...item })) },
      },
    });
  }

  private async ensureFirstManager(): Promise<void> {
    const total = await this.prisma.user.count({ where: { restaurantId: DEFAULT_RESTAURANT_ID } });
    if (total > 0) return;

    const env = parseEnv(process.env);
    if (!env.SEED_MANAGER_EMAIL || !env.SEED_MANAGER_PASSWORD) {
      this.logger.warn(
        'Nenhum usuário cadastrado. Defina SEED_MANAGER_EMAIL e SEED_MANAGER_PASSWORD para criar o primeiro gerente.',
      );
      return;
    }
    await this.prisma.user.create({
      data: {
        restaurantId: DEFAULT_RESTAURANT_ID,
        name: env.SEED_MANAGER_NAME,
        email: env.SEED_MANAGER_EMAIL,
        role: 'manager',
        passwordHash: await hashPassword(env.SEED_MANAGER_PASSWORD),
      },
    });
    this.logger.log('Primeiro gerente criado a partir das variáveis de ambiente.');
  }

  private async ensurePlatformRestaurant(): Promise<void> {
    await this.prisma.restaurant.upsert({
      where: { id: PLATFORM_RESTAURANT_ID },
      update: {},
      create: { id: PLATFORM_RESTAURANT_ID, name: PLATFORM_RESTAURANT_NAME },
    });
  }

  private async ensureSuperAdmin(): Promise<void> {
    const total = await this.prisma.user.count({ where: { role: 'super_admin' } });
    if (total > 0) return;

    const env = parseEnv(process.env);
    if (!env.SEED_SUPER_ADMIN_EMAIL || !env.SEED_SUPER_ADMIN_PASSWORD) {
      this.logger.warn(
        'Nenhum super admin cadastrado. Defina SEED_SUPER_ADMIN_EMAIL e SEED_SUPER_ADMIN_PASSWORD para criar o primeiro.',
      );
      return;
    }
    const emailTaken = await this.prisma.user.findUnique({
      where: { email: env.SEED_SUPER_ADMIN_EMAIL },
      select: { id: true },
    });
    if (emailTaken) {
      this.logger.warn('O e-mail de SEED_SUPER_ADMIN_EMAIL já pertence a outro usuário; super admin não criado.');
      return;
    }
    await this.prisma.user.create({
      data: {
        restaurantId: PLATFORM_RESTAURANT_ID,
        name: env.SEED_SUPER_ADMIN_NAME,
        email: env.SEED_SUPER_ADMIN_EMAIL,
        role: 'super_admin',
        passwordHash: await hashPassword(env.SEED_SUPER_ADMIN_PASSWORD),
      },
    });
    this.logger.log('Primeiro super admin criado a partir das variáveis de ambiente.');
  }
}
