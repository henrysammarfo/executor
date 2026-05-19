export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      action_items: {
        Row: {
          asana_task_gid: string | null;
          asana_task_url: string | null;
          completed_at: string | null;
          created_at: string;
          due_date: string | null;
          escalation_count: number;
          id: string;
          jira_issue_key: string | null;
          jira_issue_url: string | null;
          last_escalated_at: string | null;
          manager_email: string | null;
          meeting_id: string;
          notion_page_id: string | null;
          notion_page_url: string | null;
          owner_id: string;
          priority: Database["public"]["Enums"]["priority_level"];
          risk_reason: string | null;
          risk_score: number | null;
          status: Database["public"]["Enums"]["action_status"];
          verbatim_quote: string | null;
          what: string;
          who_email: string | null;
          who_name: string | null;
        };
        Insert: {
          asana_task_gid?: string | null;
          asana_task_url?: string | null;
          completed_at?: string | null;
          created_at?: string;
          due_date?: string | null;
          escalation_count?: number;
          id?: string;
          jira_issue_key?: string | null;
          jira_issue_url?: string | null;
          last_escalated_at?: string | null;
          manager_email?: string | null;
          meeting_id: string;
          notion_page_id?: string | null;
          notion_page_url?: string | null;
          owner_id: string;
          priority?: Database["public"]["Enums"]["priority_level"];
          risk_reason?: string | null;
          risk_score?: number | null;
          status?: Database["public"]["Enums"]["action_status"];
          verbatim_quote?: string | null;
          what: string;
          who_email?: string | null;
          who_name?: string | null;
        };
        Update: {
          asana_task_gid?: string | null;
          asana_task_url?: string | null;
          completed_at?: string | null;
          created_at?: string;
          due_date?: string | null;
          escalation_count?: number;
          id?: string;
          jira_issue_key?: string | null;
          jira_issue_url?: string | null;
          last_escalated_at?: string | null;
          manager_email?: string | null;
          meeting_id?: string;
          notion_page_id?: string | null;
          notion_page_url?: string | null;
          owner_id?: string;
          priority?: Database["public"]["Enums"]["priority_level"];
          risk_reason?: string | null;
          risk_score?: number | null;
          status?: Database["public"]["Enums"]["action_status"];
          verbatim_quote?: string | null;
          what?: string;
          who_email?: string | null;
          who_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "action_items_meeting_id_fkey";
            columns: ["meeting_id"];
            isOneToOne: false;
            referencedRelation: "meetings";
            referencedColumns: ["id"];
          },
        ];
      };
      execution_log: {
        Row: {
          action_item_id: string | null;
          created_at: string;
          event_type: string;
          follow_up_id: string | null;
          id: string;
          meeting_id: string | null;
          message: string | null;
          metadata: Json | null;
          owner_id: string | null;
          status: string;
        };
        Insert: {
          action_item_id?: string | null;
          created_at?: string;
          event_type: string;
          follow_up_id?: string | null;
          id?: string;
          meeting_id?: string | null;
          message?: string | null;
          metadata?: Json | null;
          owner_id?: string | null;
          status?: string;
        };
        Update: {
          action_item_id?: string | null;
          created_at?: string;
          event_type?: string;
          follow_up_id?: string | null;
          id?: string;
          meeting_id?: string | null;
          message?: string | null;
          metadata?: Json | null;
          owner_id?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      follow_ups: {
        Row: {
          action_item_id: string;
          created_at: string;
          draft_email: string;
          draft_subject: string;
          escalation_level: number;
          escalation_reason: string | null;
          id: string;
          last_attempt_at: string | null;
          last_error: string | null;
          owner_id: string;
          recipient_email: string | null;
          recipient_name: string | null;
          retry_count: number;
          scheduled_send_at: string | null;
          sent_at: string | null;
          status: Database["public"]["Enums"]["followup_status"];
        };
        Insert: {
          action_item_id: string;
          created_at?: string;
          draft_email: string;
          draft_subject: string;
          escalation_level?: number;
          escalation_reason?: string | null;
          id?: string;
          last_attempt_at?: string | null;
          last_error?: string | null;
          owner_id: string;
          recipient_email?: string | null;
          recipient_name?: string | null;
          retry_count?: number;
          scheduled_send_at?: string | null;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["followup_status"];
        };
        Update: {
          action_item_id?: string;
          created_at?: string;
          draft_email?: string;
          draft_subject?: string;
          escalation_level?: number;
          escalation_reason?: string | null;
          id?: string;
          last_attempt_at?: string | null;
          last_error?: string | null;
          owner_id?: string;
          recipient_email?: string | null;
          recipient_name?: string | null;
          retry_count?: number;
          scheduled_send_at?: string | null;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["followup_status"];
        };
        Relationships: [
          {
            foreignKeyName: "follow_ups_action_item_id_fkey";
            columns: ["action_item_id"];
            isOneToOne: false;
            referencedRelation: "action_items";
            referencedColumns: ["id"];
          },
        ];
      };
      meetings: {
        Row: {
          audio_path: string | null;
          created_at: string;
          id: string;
          organizer_email: string | null;
          owner_id: string;
          source: string;
          title: string;
          transcript_text: string | null;
        };
        Insert: {
          audio_path?: string | null;
          created_at?: string;
          id?: string;
          organizer_email?: string | null;
          owner_id: string;
          source?: string;
          title: string;
          transcript_text?: string | null;
        };
        Update: {
          audio_path?: string | null;
          created_at?: string;
          id?: string;
          organizer_email?: string | null;
          owner_id?: string;
          source?: string;
          title?: string;
          transcript_text?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      action_status: "open" | "overdue" | "complete";
      app_role: "admin" | "user";
      followup_status: "pending_review" | "auto_send" | "sent" | "cancelled" | "failed";
      priority_level: "high" | "medium" | "low";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      action_status: ["open", "overdue", "complete"],
      app_role: ["admin", "user"],
      followup_status: ["pending_review", "auto_send", "sent", "cancelled", "failed"],
      priority_level: ["high", "medium", "low"],
    },
  },
} as const;
