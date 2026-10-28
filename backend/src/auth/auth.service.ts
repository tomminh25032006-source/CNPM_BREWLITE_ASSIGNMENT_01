import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { isUniqueViolation, PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';
import { JwtPayload } from './jwt.strategy';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const user = await this.prisma.user.create({
        data: { email: dto.email, fullName: dto.fullName, passwordHash },
      });
      return this.issueToken(user);
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictException('Email này đã được đăng ký');
      throw err;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const ok = user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !ok) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    return this.issueToken(user);
  }

  async profile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Tài khoản không tồn tại');
    return toPublicUser(user);
  }

  private issueToken(user: User) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return { accessToken: this.jwt.sign(payload), user: toPublicUser(user) };
  }
}

function toPublicUser(user: User) {
  const { passwordHash: _omit, ...rest } = user;
  return rest;
}
