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
          created_at: string
          id: string
          key_hash: string
          key_last4: string
          key_prefix: string
          label: string
          last_used_at: string | null
          scopes: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_last4: string
          key_prefix: string
          label?: string
          last_used_at?: string | null
          scopes?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_last4?: string
          key_prefix?: string
          label?: string
          last_used_at?: string | null
          scopes?: string[]
          user_id?: string
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
      idempotency_records: {
        Row: {
          created_at: string
          key: string
          request_hash: string
          response_body: Json
          status: number
          user_id: string
        }
        Insert: {
          created_at?: string
          key: string
          request_hash: string
          response_body: Json
          status: number
          user_id: string
        }
        Update: {
          created_at?: string
          key?: string
          request_hash?: string
          response_body?: Json
          status?: number
          user_id?: string
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
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          plan: string
          rate_limit_per_min: number
          renewal_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          plan?: string
          rate_limit_per_min?: number
          renewal_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          plan?: string
          rate_limit_per_min?: number
          renewal_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_buckets: {
        Row: {
          bucket: number
          count: number
          user_id: string
        }
        Insert: {
          bucket: number
          count?: number
          user_id: string
        }
        Update: {
          bucket?: number
          count?: number
          user_id?: string
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
          delta_own_pct: number | null
          document_format_files: Json | null
          entities: Json | null
          exchange: string | null
          filed_at: string | null
          filing_url: string | null
          fiscal_year_end: string | null
          footnotes: Json | null
          form_type: string
          id: number
          ingestion_lag_ms: number | null
          insider_country: string | null
          insider_name: string | null
          insider_title: string | null
          is_10b5_1_plan: boolean | null
          is_amendment: boolean | null
          is_default_event: boolean | null
          is_director: boolean | null
          is_earnings_release: boolean | null
          is_exec_change: boolean | null
          is_group_filing: boolean | null
          is_ma_event: boolean | null
          is_officer: boolean | null
          is_restatement: boolean | null
          is_ten_percent_owner: boolean | null
          items: string[] | null
          no_longer_section_16: boolean | null
          original_currency: string | null
          period_of_report: string | null
          press_release_url: string | null
          price_per_share: number | null
          primary_document: string | null
          shares_owned_after: number | null
          shares_qty: number | null
          sic_code: string | null
          state_of_incorporation: string | null
          ticker: string | null
          total_transaction_value: number | null
          trade_date: string | null
          trade_type: string | null
          transaction_count: number | null
          transactions: Json | null
        }
        Insert: {
          accession_number: string
          cik?: string | null
          company_name?: string | null
          created_at?: string | null
          delta_own_pct?: number | null
          document_format_files?: Json | null
          entities?: Json | null
          exchange?: string | null
          filed_at?: string | null
          filing_url?: string | null
          fiscal_year_end?: string | null
          footnotes?: Json | null
          form_type: string
          id?: number
          ingestion_lag_ms?: number | null
          insider_country?: string | null
          insider_name?: string | null
          insider_title?: string | null
          is_10b5_1_plan?: boolean | null
          is_amendment?: boolean | null
          is_default_event?: boolean | null
          is_director?: boolean | null
          is_earnings_release?: boolean | null
          is_exec_change?: boolean | null
          is_group_filing?: boolean | null
          is_ma_event?: boolean | null
          is_officer?: boolean | null
          is_restatement?: boolean | null
          is_ten_percent_owner?: boolean | null
          items?: string[] | null
          no_longer_section_16?: boolean | null
          original_currency?: string | null
          period_of_report?: string | null
          press_release_url?: string | null
          price_per_share?: number | null
          primary_document?: string | null
          shares_owned_after?: number | null
          shares_qty?: number | null
          sic_code?: string | null
          state_of_incorporation?: string | null
          ticker?: string | null
          total_transaction_value?: number | null
          trade_date?: string | null
          trade_type?: string | null
          transaction_count?: number | null
          transactions?: Json | null
        }
        Update: {
          accession_number?: string
          cik?: string | null
          company_name?: string | null
          created_at?: string | null
          delta_own_pct?: number | null
          document_format_files?: Json | null
          entities?: Json | null
          exchange?: string | null
          filed_at?: string | null
          filing_url?: string | null
          fiscal_year_end?: string | null
          footnotes?: Json | null
          form_type?: string
          id?: number
          ingestion_lag_ms?: number | null
          insider_country?: string | null
          insider_name?: string | null
          insider_title?: string | null
          is_10b5_1_plan?: boolean | null
          is_amendment?: boolean | null
          is_default_event?: boolean | null
          is_director?: boolean | null
          is_earnings_release?: boolean | null
          is_exec_change?: boolean | null
          is_group_filing?: boolean | null
          is_ma_event?: boolean | null
          is_officer?: boolean | null
          is_restatement?: boolean | null
          is_ten_percent_owner?: boolean | null
          items?: string[] | null
          no_longer_section_16?: boolean | null
          original_currency?: string | null
          period_of_report?: string | null
          press_release_url?: string | null
          price_per_share?: number | null
          primary_document?: string | null
          shares_owned_after?: number | null
          shares_qty?: number | null
          sic_code?: string | null
          state_of_incorporation?: string | null
          ticker?: string | null
          total_transaction_value?: number | null
          trade_date?: string | null
          trade_type?: string | null
          transaction_count?: number | null
          transactions?: Json | null
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
      usage_logs: {
        Row: {
          created_at: string
          endpoint: string
          id: number
          latency_ms: number
          status: number
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: number
          latency_ms?: number
          status?: number
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: number
          latency_ms?: number
          status?: number
          user_id?: string
        }
        Relationships: []
      }
      watched_tickers: {
        Row: {
          created_at: string
          ticker: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ticker: string
          user_id: string
        }
        Update: {
          created_at?: string
          ticker?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempt: number
          attempted_at: string
          event: string
          id: string
          payload: Json
          response_body: string | null
          response_code: number | null
          status: string
          user_id: string
          webhook_id: string
        }
        Insert: {
          attempt?: number
          attempted_at?: string
          event: string
          id?: string
          payload: Json
          response_body?: string | null
          response_code?: number | null
          status?: string
          user_id: string
          webhook_id: string
        }
        Update: {
          attempt?: number
          attempted_at?: string
          event?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_code?: number | null
          status?: string
          user_id?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          active: boolean
          created_at: string
          events: string[]
          id: string
          label: string
          last_delivery_at: string | null
          secret: string
          url: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          events?: string[]
          id?: string
          label?: string
          last_delivery_at?: string | null
          secret: string
          url: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          events?: string[]
          id?: string
          label?: string
          last_delivery_at?: string | null
          secret?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      rate_bucket_incr: {
        Args: { p_bucket: number; p_user: string }
        Returns: number
      }
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
