import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find all users in the database
   * @returns Promise<User[]> - Array of all users
   */
  async findAll(): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });
    // Cast to User[] since we're only selecting specific fields
    return users as User[];
  }

  /**
   * Find a user by their unique ID
   * @param id - The unique identifier of the user
   * @returns Promise<User> - The user object
   * @throws NotFoundException - If user is not found
   */
  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    // Cast to User since we're only selecting specific fields
    return user as User;
  }

  /**
   * Find a user by their email address
   * @param email - The email address of the user
   * @returns Promise<User | null> - The user object or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Create a new user
   * @param email - The email address of the user
   * @param passwordHash - The hashed password
   * @returns Promise<User> - The created user object
   */
  async create(email: string, passwordHash: string): Promise<User> {
    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });
  }

  /**
   * Get user statistics
   * @returns Promise<object> - Statistics about users
   */
  async getStats() {
    const totalUsers = await this.prisma.user.count();
    const recentUsers = await this.prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    return {
      totalUsers,
      recentUsers,
    };
  }
}
