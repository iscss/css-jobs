export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      approved_domains: {
        Row: {
          country: string | null
          created_at: string | null
          domain: string
          id: string
          institution_name: string
          updated_at: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          domain: string
          id?: string
          institution_name: string
          updated_at?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          domain?: string
          id?: string
          institution_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          alert_id: string | null
          created_at: string
          failed_at: string | null
          failure_reason: string | null
          html_content: string
          id: string
          job_id: string | null
          max_retries: number | null
          metadata: Json | null
          recipient_email: string
          retry_count: number | null
          scheduled_for: string | null
          sent_at: string | null
          subject: string
          template_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          alert_id?: string | null
          created_at?: string
          failed_at?: string | null
          failure_reason?: string | null
          html_content: string
          id?: string
          job_id?: string | null
          max_retries?: number | null
          metadata?: Json | null
          recipient_email: string
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          subject: string
          template_type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          alert_id?: string | null
          created_at?: string
          failed_at?: string | null
          failure_reason?: string | null
          html_content?: string
          id?: string
          job_id?: string | null
          max_retries?: number | null
          metadata?: Json | null
          recipient_email?: string
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          subject?: string
          template_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "job_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_alert_matches: {
        Row: {
          alert_id: string
          id: string
          job_id: string
          matched_at: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          alert_id: string
          id?: string
          job_id: string
          matched_at?: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          alert_id?: string
          id?: string
          job_id?: string
          matched_at?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_alert_matches_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "job_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_alert_matches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_alerts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          keywords: string | null
          location: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string | null
          location?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string | null
          location?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      job_tags: {
        Row: {
          created_at: string
          id: string
          job_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          tag: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_tags_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          application_deadline: string | null
          application_url: string | null
          approval_status:
            | Database["public"]["Enums"]["job_approval_status"]
            | null
          approved_at: string | null
          approved_by_admin: string | null
          contact_email: string | null
          created_at: string
          department: string | null
          description: string
          duration: string | null
          funding_source: string | null
          id: string
          institution: string
          is_featured: boolean | null
          is_published: boolean | null
          is_remote: boolean | null
          job_status: string | null
          job_type: Database["public"]["Enums"]["job_type"]
          location: string
          notification_sent_at: string | null
          notification_sent_by: string | null
          pi_name: string | null
          posted_by: string
          requirements: string | null
          status_updated_at: string | null
          status_updated_by: string | null
          submitted_for_approval_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          application_deadline?: string | null
          application_url?: string | null
          approval_status?:
            | Database["public"]["Enums"]["job_approval_status"]
            | null
          approved_at?: string | null
          approved_by_admin?: string | null
          contact_email?: string | null
          created_at?: string
          department?: string | null
          description: string
          duration?: string | null
          funding_source?: string | null
          id?: string
          institution: string
          is_featured?: boolean | null
          is_published?: boolean | null
          is_remote?: boolean | null
          job_status?: string | null
          job_type?: Database["public"]["Enums"]["job_type"]
          location: string
          notification_sent_at?: string | null
          notification_sent_by?: string | null
          pi_name?: string | null
          posted_by: string
          requirements?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          submitted_for_approval_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          application_deadline?: string | null
          application_url?: string | null
          approval_status?:
            | Database["public"]["Enums"]["job_approval_status"]
            | null
          approved_at?: string | null
          approved_by_admin?: string | null
          contact_email?: string | null
          created_at?: string
          department?: string | null
          description?: string
          duration?: string | null
          funding_source?: string | null
          id?: string
          institution?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          is_remote?: boolean | null
          job_status?: string | null
          job_type?: Database["public"]["Enums"]["job_type"]
          location?: string
          notification_sent_at?: string | null
          notification_sent_by?: string | null
          pi_name?: string | null
          posted_by?: string
          requirements?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          submitted_for_approval_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_approved_by_admin_fkey"
            columns: ["approved_by_admin"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_notification_sent_by_fkey"
            columns: ["notification_sent_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_status_updated_by_fkey"
            columns: ["status_updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          deadline_days_before: number | null
          deadline_reminders: boolean
          deadline_time_preference: string | null
          email_frequency: string | null
          id: string
          multiple_reminders: boolean | null
          new_jobs: boolean
          updated_at: string
          user_id: string
          weekly_digest: boolean
        }
        Insert: {
          created_at?: string
          deadline_days_before?: number | null
          deadline_reminders?: boolean
          deadline_time_preference?: string | null
          email_frequency?: string | null
          id?: string
          multiple_reminders?: boolean | null
          new_jobs?: boolean
          updated_at?: string
          user_id: string
          weekly_digest?: boolean
        }
        Update: {
          created_at?: string
          deadline_days_before?: number | null
          deadline_reminders?: boolean
          deadline_time_preference?: string | null
          email_frequency?: string | null
          id?: string
          multiple_reminders?: boolean | null
          new_jobs?: boolean
          updated_at?: string
          user_id?: string
          weekly_digest?: boolean
        }
        Relationships: []
      }
      poster_applications: {
        Row: {
          created_at: string
          id: string
          institution: string
          justification: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution: string
          justification: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution?: string
          justification?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          user_id?: string
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          approved_jobs_count: number | null
          auto_approved_at: string | null
          can_publish_directly: boolean | null
          created_at: string
          email: string | null
          full_name: string | null
          google_scholar_url: string | null
          id: string
          institution: string | null
          is_admin: boolean | null
          is_approved_poster: boolean | null
          orcid_id: string | null
          requested_at: string | null
          updated_at: string
          user_type: string | null
          website_url: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_jobs_count?: number | null
          auto_approved_at?: string | null
          can_publish_directly?: boolean | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          google_scholar_url?: string | null
          id: string
          institution?: string | null
          is_admin?: boolean | null
          is_approved_poster?: boolean | null
          orcid_id?: string | null
          requested_at?: string | null
          updated_at?: string
          user_type?: string | null
          website_url?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_jobs_count?: number | null
          auto_approved_at?: string | null
          can_publish_directly?: boolean | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          google_scholar_url?: string | null
          id?: string
          institution?: string | null
          is_admin?: boolean | null
          is_approved_poster?: boolean | null
          orcid_id?: string | null
          requested_at?: string | null
          updated_at?: string
          user_type?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_job_and_update_counter: {
        Args: { admin_id: string; job_id: string }
        Returns: undefined
      }
      auto_approve_user_by_domain: {
        Args: { user_email: string; user_id: string }
        Returns: boolean
      }
      can_access_admin_user_profiles: { Args: never; Returns: boolean }
      can_user_publish_directly: { Args: { user_id: string }; Returns: boolean }
      can_view_sensitive_profile_data: {
        Args: { profile_user_id: string }
        Returns: boolean
      }
      count_unread_job_matches: {
        Args: { user_id_param: string }
        Returns: number
      }
      create_job_alert_matches: {
        Args: { job_id_param: string }
        Returns: number
      }
      get_admin_user_profiles: {
        Args: never
        Returns: {
          approval_status: string
          approved_at: string
          approved_by: string
          auth_created_at: string
          auth_email: string
          created_at: string
          email: string
          email_confirmed_at: string
          full_name: string
          google_scholar_url: string
          id: string
          institution: string
          is_admin: boolean
          is_approved_poster: boolean
          last_sign_in_at: string
          orcid_id: string
          requested_at: string
          updated_at: string
          user_type: string
          website_url: string
        }[]
      }
      get_user_job_matches: {
        Args: { limit_param?: number; user_id_param: string }
        Returns: {
          alert_keywords: string
          alert_location: string
          job_id: string
          job_institution: string
          job_location: string
          job_title: string
          matched_at: string
        }[]
      }
      is_admin: { Args: { user_id?: string }; Returns: boolean }
      job_matches_alert: {
        Args: {
          alert_row: Database["public"]["Tables"]["job_alerts"]["Row"]
          job_row: Database["public"]["Tables"]["jobs"]["Row"]
        }
        Returns: boolean
      }
      populate_approved_domains: { Args: never; Returns: string }
      populate_university_domains: { Args: never; Returns: number }
      queue_deadline_reminders: { Args: never; Returns: number }
      queue_job_alert_emails: {
        Args: { job_id_param: string }
        Returns: number
      }
    }
    Enums: {
      application_status: "pending" | "approved" | "rejected"
      job_approval_status: "draft" | "pending" | "approved" | "rejected"
      job_type:
        | "PhD"
        | "Postdoc"
        | "Faculty"
        | "Research Assistant"
        | "Internship"
        | "Other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      application_status: ["pending", "approved", "rejected"],
      job_approval_status: ["draft", "pending", "approved", "rejected"],
      job_type: [
        "PhD",
        "Postdoc",
        "Faculty",
        "Research Assistant",
        "Internship",
        "Other",
      ],
    },
  },
} as const
