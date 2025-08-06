export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
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
          job_type: Database["public"]["Enums"]["job_type"]
          location: string
          pi_name: string | null
          posted_by: string
          requirements: string | null
          title: string
          updated_at: string
        }
        Insert: {
          application_deadline?: string | null
          application_url?: string | null
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
          job_type?: Database["public"]["Enums"]["job_type"]
          location: string
          pi_name?: string | null
          posted_by: string
          requirements?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          application_deadline?: string | null
          application_url?: string | null
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
          job_type?: Database["public"]["Enums"]["job_type"]
          location?: string
          pi_name?: string | null
          posted_by?: string
          requirements?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "admin_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_posted_by_fkey"
            columns: ["posted_by"]
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
      user_profiles: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
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
      admin_user_profiles: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          auth_created_at: string | null
          auth_email: string | null
          created_at: string | null
          email: string | null
          email_confirmed_at: string | null
          full_name: string | null
          google_scholar_url: string | null
          id: string | null
          institution: string | null
          is_admin: boolean | null
          is_approved_poster: boolean | null
          last_sign_in_at: string | null
          orcid_id: string | null
          requested_at: string | null
          updated_at: string | null
          user_type: string | null
          website_url: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_admin_user_profiles: {
        Args: Record<PropertyKey, never>
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
      get_user_job_matches: {
        Args: { user_id_param: string; limit_param?: number }
        Returns: {
          job_id: string
          job_title: string
          job_institution: string
          job_location: string
          alert_keywords: string
          alert_location: string
          matched_at: string
        }[]
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      job_matches_alert: {
        Args: {
          job_row: Database["public"]["Tables"]["jobs"]["Row"]
          alert_row: Database["public"]["Tables"]["job_alerts"]["Row"]
        }
        Returns: boolean
      }
      queue_deadline_reminders: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      queue_job_alert_emails: {
        Args: { job_id_param: string }
        Returns: number
      }
    }
    Enums: {
      application_status: "pending" | "approved" | "rejected"
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
