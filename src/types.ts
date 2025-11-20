export interface CustomerData {
  email: string;
  name?: string;
  [key: string]: any;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body?: string;
}

export interface FilterCriteria {
  [key: string]: any;
}