export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "collector" | "contributor";
export type EqubFrequency = "daily" | "weekly" | "monthly";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone_number: string | null;
          role: UserRole | null;
          status: "active" | "pending" | "rejected";
          email: string | null;
          password: string | null;
          collector_id: string | null;
          created_at: string;
          telegram_id: number | null;
          telegram_chat_id: number | null;
          telegram_username: string | null;
          telegram_verified: boolean | null;
          telegram_linked_at: string | null;
          telegram_last_seen: string | null;
        };
        Insert: {
          id?: string;
          full_name?: string | null;
          phone_number?: string | null;
          role?: UserRole | null;
          status?: "active" | "pending" | "rejected";
          email?: string | null;
          password?: string | null;
          collector_id?: string | null;
          created_at?: string;
          telegram_id?: number | null;
          telegram_chat_id?: number | null;
          telegram_username?: string | null;
          telegram_verified?: boolean | null;
          telegram_linked_at?: string | null;
          telegram_last_seen?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone_number?: string | null;
          role?: UserRole | null;
          status?: "active" | "pending" | "rejected";
          email?: string | null;
          password?: string | null;
          collector_id?: string | null;
          created_at?: string;
          telegram_id?: number | null;
          telegram_chat_id?: number | null;
          telegram_username?: string | null;
          telegram_verified?: boolean | null;
          telegram_linked_at?: string | null;
          telegram_last_seen?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: "contributor_request" | "approved" | "rejected";
          title: string;
          message: string;
          data: Record<string, unknown>;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "contributor_request" | "approved" | "rejected";
          title: string;
          message: string;
          data?: Record<string, unknown>;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "contributor_request" | "approved" | "rejected";
          title?: string;
          message?: string;
          data?: Record<string, unknown>;
          is_read?: boolean;
          created_at?: string;
        };
      };
      equb_groups: {
        Row: {
          id: string;
          name: string;
          contribution_amount: number;
          total_days: number;
          frequency: EqubFrequency;
          created_at: string;
          collector_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          contribution_amount: number;
          total_days: number;
          frequency: EqubFrequency;
          created_at?: string;
          collector_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          contribution_amount?: number;
          total_days?: number;
          frequency?: EqubFrequency;
          created_at?: string;
          collector_id?: string | null;
        };
      };
      group_memberships: {
        Row: {
          id: string;
          group_id: string;
          contributor_id: string;
          collector_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          contributor_id: string;
          collector_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          contributor_id?: string;
          collector_id?: string;
          created_at?: string;
        };
      };
      contributions: {
        Row: {
          id: string;
          contributor_id: string;
          collector_id: string;
          group_id: string;
          contribution_date: string;
          cycle_number: number;
          is_marked_paid: boolean;
          disbursed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          contributor_id: string;
          collector_id: string;
          group_id: string;
          contribution_date?: string;
          cycle_number: number;
          is_marked_paid?: boolean;
          disbursed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          contributor_id?: string;
          collector_id?: string;
          group_id?: string;
          contribution_date?: string;
          cycle_number?: number;
          is_marked_paid?: boolean;
          disbursed?: boolean;
          created_at?: string;
        };
      };
      contribution_rules: {
        Row: {
          id: string;
          collector_id: string;
          rule_text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          collector_id: string;
          rule_text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          collector_id?: string;
          rule_text?: string;
          created_at?: string;
        };
      };
      telegram_otps: {
        Row: {
          id: string;
          user_id: string;
          otp_code: string;
          purpose: "password_reset" | "account_verify" | "telegram_link" | "sensitive_action";
          expires_at: string;
          used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          otp_code: string;
          purpose: "password_reset" | "account_verify" | "telegram_link" | "sensitive_action";
          expires_at: string;
          used?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          otp_code?: string;
          purpose?: "password_reset" | "account_verify" | "telegram_link" | "sensitive_action";
          expires_at?: string;
          used?: boolean;
          created_at?: string;
        };
      };
      telegram_notification_prefs: {
        Row: {
          id: string;
          user_id: string;
          contribution_confirmations: boolean;
          daily_reports: boolean;
          weekly_reports: boolean;
          payment_reminders: boolean;
          broadcast_announcements: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contribution_confirmations?: boolean;
          daily_reports?: boolean;
          weekly_reports?: boolean;
          payment_reminders?: boolean;
          broadcast_announcements?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          contribution_confirmations?: boolean;
          daily_reports?: boolean;
          weekly_reports?: boolean;
          payment_reminders?: boolean;
          broadcast_announcements?: boolean;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      equb_frequency: EqubFrequency;
    };
  };
}
