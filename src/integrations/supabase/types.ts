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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          calls_this_month: number | null
          created_at: string | null
          customer_email: string | null
          customer_name: string
          id: number
          is_active: boolean | null
          key: string
          last_reset_date: string | null
          monthly_limit: number | null
        }
        Insert: {
          calls_this_month?: number | null
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          id?: number
          is_active?: boolean | null
          key: string
          last_reset_date?: string | null
          monthly_limit?: number | null
        }
        Update: {
          calls_this_month?: number | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          id?: number
          is_active?: boolean | null
          key?: string
          last_reset_date?: string | null
          monthly_limit?: number | null
        }
        Relationships: []
      }
      bot_scan_state: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      filings: {
        Row: {
          accession: string
          created_at: string | null
          filed_at: string
          id: number
          insider_name: string | null
          is_10b5: boolean | null
          ticker: string
          title: string | null
          value: number | null
        }
        Insert: {
          accession: string
          created_at?: string | null
          filed_at: string
          id?: number
          insider_name?: string | null
          is_10b5?: boolean | null
          ticker: string
          title?: string | null
          value?: number | null
        }
        Update: {
          accession?: string
          created_at?: string | null
          filed_at?: string
          id?: number
          insider_name?: string | null
          is_10b5?: boolean | null
          ticker?: string
          title?: string | null
          value?: number | null
        }
        Relationships: []
      }
      insider_form4_filings: {
        Row: {
          accession: string
          cik: string | null
          created_at: string
          filed_at: string
          filing_filename: string | null
          filing_href: string | null
          id: number
          is_10b5: boolean | null
          is_director: boolean | null
          is_officer: boolean | null
          is_ten_percent_owner: boolean | null
          issuer_name: string | null
          price_per_share: number | null
          raw_json: Json | null
          raw_xml: string | null
          reporting_owner_name: string | null
          reporting_owner_title: string | null
          sec_updated_at: string | null
          shares: number | null
          ticker: string
          transaction_code: string | null
          transaction_value: number
          updated_at: string
        }
        Insert: {
          accession: string
          cik?: string | null
          created_at?: string
          filed_at: string
          filing_filename?: string | null
          filing_href?: string | null
          id?: never
          is_10b5?: boolean | null
          is_director?: boolean | null
          is_officer?: boolean | null
          is_ten_percent_owner?: boolean | null
          issuer_name?: string | null
          price_per_share?: number | null
          raw_json?: Json | null
          raw_xml?: string | null
          reporting_owner_name?: string | null
          reporting_owner_title?: string | null
          sec_updated_at?: string | null
          shares?: number | null
          ticker: string
          transaction_code?: string | null
          transaction_value: number
          updated_at?: string
        }
        Update: {
          accession?: string
          cik?: string | null
          created_at?: string
          filed_at?: string
          filing_filename?: string | null
          filing_href?: string | null
          id?: never
          is_10b5?: boolean | null
          is_director?: boolean | null
          is_officer?: boolean | null
          is_ten_percent_owner?: boolean | null
          issuer_name?: string | null
          price_per_share?: number | null
          raw_json?: Json | null
          raw_xml?: string | null
          reporting_owner_name?: string | null
          reporting_owner_title?: string | null
          sec_updated_at?: string | null
          shares?: number | null
          ticker?: string
          transaction_code?: string | null
          transaction_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          cluster: boolean | null
          cluster_size: number | null
          created_at: string | null
          entry_date: string | null
          entry_price: number | null
          exit_date: string | null
          exit_price: number | null
          exit_reason: string | null
          hold_days: number | null
          id: number
          kelly: number | null
          return_pct: number | null
          score: number | null
          status: string | null
          ticker: string
          total_value: number | null
        }
        Insert: {
          cluster?: boolean | null
          cluster_size?: number | null
          created_at?: string | null
          entry_date?: string | null
          entry_price?: number | null
          exit_date?: string | null
          exit_price?: number | null
          exit_reason?: string | null
          hold_days?: number | null
          id?: number
          kelly?: number | null
          return_pct?: number | null
          score?: number | null
          status?: string | null
          ticker: string
          total_value?: number | null
        }
        Update: {
          cluster?: boolean | null
          cluster_size?: number | null
          created_at?: string | null
          entry_date?: string | null
          entry_price?: number | null
          exit_date?: string | null
          exit_price?: number | null
          exit_reason?: string | null
          hold_days?: number | null
          id?: number
          kelly?: number | null
          return_pct?: number | null
          score?: number | null
          status?: string | null
          ticker?: string
          total_value?: number | null
        }
        Relationships: []
      }
      run_log: {
        Row: {
          created_at: string | null
          equity: number | null
          filings_fetched: number | null
          id: number
          mode: string | null
          signals_evaluated: number | null
          spy_r3m: number | null
          trades_taken: number | null
        }
        Insert: {
          created_at?: string | null
          equity?: number | null
          filings_fetched?: number | null
          id?: number
          mode?: string | null
          signals_evaluated?: number | null
          spy_r3m?: number | null
          trades_taken?: number | null
        }
        Update: {
          created_at?: string | null
          equity?: number | null
          filings_fetched?: number | null
          id?: number
          mode?: string | null
          signals_evaluated?: number | null
          spy_r3m?: number | null
          trades_taken?: number | null
        }
        Relationships: []
      }
      sec_filings: {
        Row: {
          accession_number: string
          cik: string | null
          company_name: string | null
          created_at: string | null
          description: string | null
          filing_date: string
          filing_url: string | null
          form_type: string
          id: number
          report_date: string | null
          ticker: string | null
        }
        Insert: {
          accession_number: string
          cik?: string | null
          company_name?: string | null
          created_at?: string | null
          description?: string | null
          filing_date: string
          filing_url?: string | null
          form_type: string
          id?: number
          report_date?: string | null
          ticker?: string | null
        }
        Update: {
          accession_number?: string
          cik?: string | null
          company_name?: string | null
          created_at?: string | null
          description?: string | null
          filing_date?: string
          filing_url?: string | null
          form_type?: string
          id?: number
          report_date?: string | null
          ticker?: string | null
        }
        Relationships: []
      }
      signals: {
        Row: {
          atr_pct: number | null
          avg_vol_30d: number | null
          cluster: boolean | null
          cluster_size: number | null
          created_at: string | null
          filed_at: string
          filter_reason: string | null
          h52: number | null
          id: number
          insider_names: string[] | null
          kelly: number | null
          r3m: number | null
          score: number | null
          score_components: Json | null
          spy_r3m: number | null
          status: string | null
          ticker: string
          total_value: number | null
        }
        Insert: {
          atr_pct?: number | null
          avg_vol_30d?: number | null
          cluster?: boolean | null
          cluster_size?: number | null
          created_at?: string | null
          filed_at: string
          filter_reason?: string | null
          h52?: number | null
          id?: number
          insider_names?: string[] | null
          kelly?: number | null
          r3m?: number | null
          score?: number | null
          score_components?: Json | null
          spy_r3m?: number | null
          status?: string | null
          ticker: string
          total_value?: number | null
        }
        Update: {
          atr_pct?: number | null
          avg_vol_30d?: number | null
          cluster?: boolean | null
          cluster_size?: number | null
          created_at?: string | null
          filed_at?: string
          filter_reason?: string | null
          h52?: number | null
          id?: number
          insider_names?: string[] | null
          kelly?: number | null
          r3m?: number | null
          score?: number | null
          score_components?: Json | null
          spy_r3m?: number | null
          status?: string | null
          ticker?: string
          total_value?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
