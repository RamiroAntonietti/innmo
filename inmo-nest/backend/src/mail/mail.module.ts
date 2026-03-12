import { Module, Global } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { MailService } from './mail.service';
import { MailSchedulerService } from './mail-scheduler.service';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: () => {
        const user = process.env.MAIL_USER || '';
        const pass = process.env.MAIL_PASS || '';
        const from = process.env.MAIL_FROM || '"Sistema Inmobiliario" <noreply@inmobiliaria.com>';

        // Si no hay credenciales, usar jsonTransport (no envía, evita errores 530)
        const transport = user && pass
          ? {
              host: process.env.MAIL_HOST || 'smtp.gmail.com',
              port: parseInt(process.env.MAIL_PORT || '587', 10),
              secure: process.env.MAIL_PORT === '465',
              auth: { user, pass },
            }
          : { jsonTransport: true };

        return {
          transport,
          defaults: { from },
          template: {
            dir: join(__dirname, 'templates'),
            adapter: new HandlebarsAdapter(),
            options: { strict: true },
          },
        };
      },
    }),
  ],
  providers: [MailService, MailSchedulerService],
  exports: [MailService],
})
export class MailModule {}
