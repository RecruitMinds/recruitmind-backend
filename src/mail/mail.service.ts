import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { BaseEmailTemplate } from './types/mail.types';
import { invitationTemplate } from './templates/invitation.template';

@Injectable()
export class MailService {
  private resend: Resend;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
  }

  async sendEmail(to: string, template: BaseEmailTemplate) {
    try {
      const data = await this.resend.emails.send({
        from: 'RecruitMind <onboarding@resend.dev>',
        to: [to],
        subject: template.subject,
        html: template.html,
      });

      return data;
    } catch (error) {
      throw error;
    }
  }

  async sendInterviewInvitation(
    to: string,
    data: {
      name: string;
      role: string;
      company: string;
      companyLogo?: string;
      invitationLink: string;
    },
  ) {
    const template = invitationTemplate(data);
    return this.sendEmail(to, template);
  }
}
