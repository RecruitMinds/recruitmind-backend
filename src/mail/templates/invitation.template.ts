import { BaseEmailTemplate, TemplateData } from '../types/mail.types';

interface InvitationTemplateData extends TemplateData {
  name: string;
  role: string;
  company: string;
  companyLogo?: string;
  invitationLink: string;
}

export const invitationTemplate = (
  data: InvitationTemplateData,
): BaseEmailTemplate => ({
  subject: `Interview Invitation for ${data.role} position at ${data.company}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${
        data.companyLogo
          ? `
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${data.companyLogo}" alt="${data.company} logo" style="max-height: 60px;">
        </div>
      `
          : ''
      }
      
      <h1 style="color: #2c3e50; font-size: 24px;">Interview Invitation</h1>
      
      <p style="color: #34495e; font-size: 16px;">Dear ${data.name},</p>
      
      <p style="color: #34495e; font-size: 16px;">
        We are pleased to invite you for an interview for the position of <strong>${data.role}</strong> 
        at ${data.company}. We were impressed with your profile and would like to discuss this 
        opportunity with you in detail.
      </p>
      
      <p style="color: #34495e; font-size: 16px;">
        Please click the button below to proceed with scheduling your interview:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.invitationLink}" 
           style="background-color: #3498db; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 5px; 
                  display: inline-block;">
          Schedule Interview
        </a>
      </div>
      
      <p style="color: #7f8c8d; font-size: 14px;">
        If you have any questions, please don't hesitate to reach out to us.
      </p>
      
      <p style="color: #7f8c8d; font-size: 14px;">
        Best regards,<br>
        ${data.company} Hiring Team
      </p>
    </div>
  `,
});
