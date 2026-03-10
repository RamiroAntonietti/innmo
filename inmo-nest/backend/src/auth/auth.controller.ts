import { Controller, Post, Get, Body, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { JwtAuthGuard, Public } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private svc: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) { return this.svc.register(dto); }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = req.ip || req.headers['x-forwarded-for'];
    return this.svc.login(dto, ip);
  }

  /** Solo en desarrollo: POST /auth/reset-password con { "email": "...", "newPassword": "..." } para hashear y guardar la contraseña. */
  @Public()
  @Post('reset-password')
  resetPassword(@Body() body: { email: string; newPassword: string }) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('No disponible en producción.');
    }
    return this.svc.resetPasswordDev(body.email?.trim(), body.newPassword);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser('sub') userId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.svc.me(userId, tenantId);
  }
}
