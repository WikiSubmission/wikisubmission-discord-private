export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      DataMocMedia: {
        Row: {
          media_end_seconds: number | null
          media_end_timestamp: string | null
          media_episode: number | null
          media_index: number
          media_length: number | null
          media_markdown: string | null
          media_start_seconds: number | null
          media_start_timestamp: string | null
          media_title: string | null
          media_transcript: string | null
          media_type: string | null
          media_version: string | null
          media_youtube_id: string | null
          media_youtube_thumbnail: string | null
          media_youtube_timestamp: string | null
          media_youtube_title: string | null
        }
        Insert: {
          media_end_seconds?: number | null
          media_end_timestamp?: string | null
          media_episode?: number | null
          media_index?: number
          media_length?: number | null
          media_markdown?: string | null
          media_start_seconds?: number | null
          media_start_timestamp?: string | null
          media_title?: string | null
          media_transcript?: string | null
          media_type?: string | null
          media_version?: string | null
          media_youtube_id?: string | null
          media_youtube_thumbnail?: string | null
          media_youtube_timestamp?: string | null
          media_youtube_title?: string | null
        }
        Update: {
          media_end_seconds?: number | null
          media_end_timestamp?: string | null
          media_episode?: number | null
          media_index?: number
          media_length?: number | null
          media_markdown?: string | null
          media_start_seconds?: number | null
          media_start_timestamp?: string | null
          media_title?: string | null
          media_transcript?: string | null
          media_type?: string | null
          media_version?: string | null
          media_youtube_id?: string | null
          media_youtube_thumbnail?: string | null
          media_youtube_timestamp?: string | null
          media_youtube_title?: string | null
        }
        Relationships: []
      }
      DataNewsletters: {
        Row: {
          sp_content: string | null
          sp_index: number
          sp_month: string
          sp_page: number
          sp_tag: string
          sp_year: number
        }
        Insert: {
          sp_content?: string | null
          sp_index?: number
          sp_month: string
          sp_page: number
          sp_tag: string
          sp_year: number
        }
        Update: {
          sp_content?: string | null
          sp_index?: number
          sp_month?: string
          sp_page?: number
          sp_tag?: string
          sp_year?: number
        }
        Relationships: []
      }
      DataQuran: {
        Row: {
          chapter_god_total: number
          chapter_initials: string
          chapter_number: number
          chapter_revelation_order: number
          chapter_title_arabic: string
          chapter_title_arabic_transliteration: string
          chapter_title_bahasa: string
          chapter_title_english: string
          chapter_title_french: string
          chapter_title_persian: string
          chapter_title_russian: string
          chapter_title_swedish: string
          chapter_title_turkish: string
          chapter_verses: number
          verse_audio_arabic_basit: string
          verse_audio_arabic_minshawi: string
          verse_audio_arabic_mishary: string
          verse_footnote_english: string | null
          verse_footnote_german: string | null
          verse_footnote_tamil: string | null
          verse_footnote_turkish: string | null
          verse_gematrical_value: number
          verse_god_count: number
          verse_id: string
          verse_id_arabic: string
          verse_index: number
          verse_index_initialed: number | null
          verse_index_numbered: number | null
          verse_letter_count: number
          verse_number: number
          verse_raw_image_arabic: string
          verse_subtitle_english: string | null
          verse_subtitle_tamil: string | null
          verse_subtitle_turkish: string | null
          verse_text_arabic: string
          verse_text_arabic_clean: string
          verse_text_arabic_transliteration: string | null
          verse_text_bahasa: string
          verse_text_english: string
          verse_text_french: string
          verse_text_german: string | null
          verse_text_persian: string
          verse_text_russian: string
          verse_text_swedish: string
          verse_text_tamil: string
          verse_text_turkish: string
          verse_word_count: number
        }
        Insert: {
          chapter_god_total: number
          chapter_initials: string
          chapter_number: number
          chapter_revelation_order: number
          chapter_title_arabic: string
          chapter_title_arabic_transliteration: string
          chapter_title_bahasa: string
          chapter_title_english: string
          chapter_title_french: string
          chapter_title_persian: string
          chapter_title_russian: string
          chapter_title_swedish: string
          chapter_title_turkish: string
          chapter_verses: number
          verse_audio_arabic_basit: string
          verse_audio_arabic_minshawi: string
          verse_audio_arabic_mishary: string
          verse_footnote_english?: string | null
          verse_footnote_german?: string | null
          verse_footnote_tamil?: string | null
          verse_footnote_turkish?: string | null
          verse_gematrical_value: number
          verse_god_count: number
          verse_id: string
          verse_id_arabic: string
          verse_index: number
          verse_index_initialed?: number | null
          verse_index_numbered?: number | null
          verse_letter_count: number
          verse_number: number
          verse_raw_image_arabic: string
          verse_subtitle_english?: string | null
          verse_subtitle_tamil?: string | null
          verse_subtitle_turkish?: string | null
          verse_text_arabic: string
          verse_text_arabic_clean: string
          verse_text_arabic_transliteration?: string | null
          verse_text_bahasa: string
          verse_text_english: string
          verse_text_french: string
          verse_text_german?: string | null
          verse_text_persian: string
          verse_text_russian: string
          verse_text_swedish: string
          verse_text_tamil?: string
          verse_text_turkish: string
          verse_word_count: number
        }
        Update: {
          chapter_god_total?: number
          chapter_initials?: string
          chapter_number?: number
          chapter_revelation_order?: number
          chapter_title_arabic?: string
          chapter_title_arabic_transliteration?: string
          chapter_title_bahasa?: string
          chapter_title_english?: string
          chapter_title_french?: string
          chapter_title_persian?: string
          chapter_title_russian?: string
          chapter_title_swedish?: string
          chapter_title_turkish?: string
          chapter_verses?: number
          verse_audio_arabic_basit?: string
          verse_audio_arabic_minshawi?: string
          verse_audio_arabic_mishary?: string
          verse_footnote_english?: string | null
          verse_footnote_german?: string | null
          verse_footnote_tamil?: string | null
          verse_footnote_turkish?: string | null
          verse_gematrical_value?: number
          verse_god_count?: number
          verse_id?: string
          verse_id_arabic?: string
          verse_index?: number
          verse_index_initialed?: number | null
          verse_index_numbered?: number | null
          verse_letter_count?: number
          verse_number?: number
          verse_raw_image_arabic?: string
          verse_subtitle_english?: string | null
          verse_subtitle_tamil?: string | null
          verse_subtitle_turkish?: string | null
          verse_text_arabic?: string
          verse_text_arabic_clean?: string
          verse_text_arabic_transliteration?: string | null
          verse_text_bahasa?: string
          verse_text_english?: string
          verse_text_french?: string
          verse_text_german?: string | null
          verse_text_persian?: string
          verse_text_russian?: string
          verse_text_swedish?: string
          verse_text_tamil?: string
          verse_text_turkish?: string
          verse_word_count?: number
        }
        Relationships: []
      }
      DataQuranWordByWord: {
        Row: {
          arabic_text: string | null
          english_text: string | null
          id: string
          root_word_1: string | null
          root_word_2: string | null
          root_word_3: string | null
          transliterated_text: string | null
          verse_id: string
        }
        Insert: {
          arabic_text?: string | null
          english_text?: string | null
          id?: string
          root_word_1?: string | null
          root_word_2?: string | null
          root_word_3?: string | null
          transliterated_text?: string | null
          verse_id: string
        }
        Update: {
          arabic_text?: string | null
          english_text?: string | null
          id?: string
          root_word_1?: string | null
          root_word_2?: string | null
          root_word_3?: string | null
          transliterated_text?: string | null
          verse_id?: string
        }
        Relationships: []
      }
      DiscordMembers: {
        Row: {
          avatar_url: string
          created_at: string
          created_timestamp: number
          display_name: string
          guild_id: string
          id: string
          joined_timestamp: number
          roles: string
          user_id: string
          user_name: string
        }
        Insert: {
          avatar_url?: string
          created_at?: string
          created_timestamp: number
          display_name: string
          guild_id: string
          id: string
          joined_timestamp: number
          roles?: string
          user_id: string
          user_name: string
        }
        Update: {
          avatar_url?: string
          created_at?: string
          created_timestamp?: number
          display_name?: string
          guild_id?: string
          id?: string
          joined_timestamp?: number
          roles?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      DiscordSecrets: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value?: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      GlobalCache: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      Secrets: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
