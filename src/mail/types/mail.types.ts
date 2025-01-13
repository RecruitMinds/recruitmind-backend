export interface BaseEmailTemplate {
  subject: string;
  html: string;
}

export interface TemplateData {
  [key: string]: any;
}
