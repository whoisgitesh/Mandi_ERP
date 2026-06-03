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
      customers: {
        Row: {
          address: string | null
          balance_lcy: number
          blocked: string | null
          city: string | null
          closeing_balance: number
          closing_balance: number
          contact: string | null
          country_region_code: string | null
          created_at: string
          credit_limit_lcy: number
          currency_code: string | null
          customer_no: string
          email: string | null
          gst_customer_type: string | null
          gst_registration_no: string | null
          id: string
          location_code: string | null
          name: string
          opening_balance: number
          overdue_balance_lcy: number
          pan_no: string | null
          payment_method_code: string | null
          payment_terms_code: string | null
          payments_lcy: number
          phone_no: string | null
          post_code: string | null
          responsibility_center: string | null
          sales_lcy: number
          salesperson_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          balance_lcy?: number
          blocked?: string | null
          city?: string | null
          closeing_balance?: number
          closing_balance?: number
          contact?: string | null
          country_region_code?: string | null
          created_at?: string
          credit_limit_lcy?: number
          currency_code?: string | null
          customer_no: string
          email?: string | null
          gst_customer_type?: string | null
          gst_registration_no?: string | null
          id?: string
          location_code?: string | null
          name: string
          opening_balance?: number
          overdue_balance_lcy?: number
          pan_no?: string | null
          payment_method_code?: string | null
          payment_terms_code?: string | null
          payments_lcy?: number
          phone_no?: string | null
          post_code?: string | null
          responsibility_center?: string | null
          sales_lcy?: number
          salesperson_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          balance_lcy?: number
          blocked?: string | null
          city?: string | null
          closeing_balance?: number
          closing_balance?: number
          contact?: string | null
          country_region_code?: string | null
          created_at?: string
          credit_limit_lcy?: number
          currency_code?: string | null
          customer_no?: string
          email?: string | null
          gst_customer_type?: string | null
          gst_registration_no?: string | null
          id?: string
          location_code?: string | null
          name?: string
          opening_balance?: number
          overdue_balance_lcy?: number
          pan_no?: string | null
          payment_method_code?: string | null
          payment_terms_code?: string | null
          payments_lcy?: number
          phone_no?: string | null
          post_code?: string | null
          responsibility_center?: string | null
          sales_lcy?: number
          salesperson_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      goods_receipt_note: {
        Row: {
          address: string | null
          address_2: string | null
          alternate_vendor_address_code: string | null
          broker_code: string | null
          broker_name: string | null
          brokerage: number
          cash_discount: number
          challan_no: string | null
          charge_group_code: string | null
          city: string | null
          contact: string | null
          country_region_code: string | null
          created_at: string
          creditor_no: string | null
          currency_code: string | null
          deduction: number
          delivery_terms: string | null
          department_code: string | null
          description: string | null
          discount: number
          document_date: string
          document_no: string
          due_date: string | null
          email: string | null
          entry_type: string | null
          expected_receipt_date: string | null
          id: string
          include_gst_in_tds_base: boolean
          invoice_received_date: string | null
          linked_with_e_document: boolean
          location_code: string | null
          lr_date: string | null
          lr_no: string | null
          mobile_phone_no: string | null
          narration: string | null
          on_hold: string | null
          order_date: string | null
          order_type: string | null
          payment_discount_pct: number
          payment_method_code: string | null
          payment_reference: string | null
          payment_terms_code: string | null
          phone_no: string | null
          post_code: string | null
          posting_date: string
          prepared_by: string | null
          prices_including_vat: boolean
          promised_receipt_date: string | null
          purchaser_code: string | null
          quote_no: string | null
          receiving_no: string | null
          receiving_no_series: string | null
          referred_by: string | null
          referred_by_phone_no: string | null
          remaining_tds_cert_value: number
          requested_receipt_date: string | null
          shipment_method_code: string | null
          source_inward_gate_entry_id: string | null
          source_purchase_order_id: string | null
          status: string
          updated_at: string
          vat_date: string | null
          vehicle_no: string | null
          vendor_gst_reg_no: string | null
          vendor_invoice_date: string | null
          vendor_invoice_no: string | null
          vendor_name: string | null
          vendor_no: string
          vendor_order_no: string | null
          your_reference: string | null
        }
        Insert: {
          address?: string | null
          address_2?: string | null
          alternate_vendor_address_code?: string | null
          broker_code?: string | null
          broker_name?: string | null
          brokerage?: number
          cash_discount?: number
          challan_no?: string | null
          charge_group_code?: string | null
          city?: string | null
          contact?: string | null
          country_region_code?: string | null
          created_at?: string
          creditor_no?: string | null
          currency_code?: string | null
          deduction?: number
          delivery_terms?: string | null
          department_code?: string | null
          description?: string | null
          discount?: number
          document_date?: string
          document_no: string
          due_date?: string | null
          email?: string | null
          entry_type?: string | null
          expected_receipt_date?: string | null
          id?: string
          include_gst_in_tds_base?: boolean
          invoice_received_date?: string | null
          linked_with_e_document?: boolean
          location_code?: string | null
          lr_date?: string | null
          lr_no?: string | null
          mobile_phone_no?: string | null
          narration?: string | null
          on_hold?: string | null
          order_date?: string | null
          order_type?: string | null
          payment_discount_pct?: number
          payment_method_code?: string | null
          payment_reference?: string | null
          payment_terms_code?: string | null
          phone_no?: string | null
          post_code?: string | null
          posting_date?: string
          prepared_by?: string | null
          prices_including_vat?: boolean
          promised_receipt_date?: string | null
          purchaser_code?: string | null
          quote_no?: string | null
          receiving_no?: string | null
          receiving_no_series?: string | null
          referred_by?: string | null
          referred_by_phone_no?: string | null
          remaining_tds_cert_value?: number
          requested_receipt_date?: string | null
          shipment_method_code?: string | null
          source_inward_gate_entry_id?: string | null
          source_purchase_order_id?: string | null
          status?: string
          updated_at?: string
          vat_date?: string | null
          vehicle_no?: string | null
          vendor_gst_reg_no?: string | null
          vendor_invoice_date?: string | null
          vendor_invoice_no?: string | null
          vendor_name?: string | null
          vendor_no: string
          vendor_order_no?: string | null
          your_reference?: string | null
        }
        Update: {
          address?: string | null
          address_2?: string | null
          alternate_vendor_address_code?: string | null
          broker_code?: string | null
          broker_name?: string | null
          brokerage?: number
          cash_discount?: number
          challan_no?: string | null
          charge_group_code?: string | null
          city?: string | null
          contact?: string | null
          country_region_code?: string | null
          created_at?: string
          creditor_no?: string | null
          currency_code?: string | null
          deduction?: number
          delivery_terms?: string | null
          department_code?: string | null
          description?: string | null
          discount?: number
          document_date?: string
          document_no?: string
          due_date?: string | null
          email?: string | null
          entry_type?: string | null
          expected_receipt_date?: string | null
          id?: string
          include_gst_in_tds_base?: boolean
          invoice_received_date?: string | null
          linked_with_e_document?: boolean
          location_code?: string | null
          lr_date?: string | null
          lr_no?: string | null
          mobile_phone_no?: string | null
          narration?: string | null
          on_hold?: string | null
          order_date?: string | null
          order_type?: string | null
          payment_discount_pct?: number
          payment_method_code?: string | null
          payment_reference?: string | null
          payment_terms_code?: string | null
          phone_no?: string | null
          post_code?: string | null
          posting_date?: string
          prepared_by?: string | null
          prices_including_vat?: boolean
          promised_receipt_date?: string | null
          purchaser_code?: string | null
          quote_no?: string | null
          receiving_no?: string | null
          receiving_no_series?: string | null
          referred_by?: string | null
          referred_by_phone_no?: string | null
          remaining_tds_cert_value?: number
          requested_receipt_date?: string | null
          shipment_method_code?: string | null
          source_inward_gate_entry_id?: string | null
          source_purchase_order_id?: string | null
          status?: string
          updated_at?: string
          vat_date?: string | null
          vehicle_no?: string | null
          vendor_gst_reg_no?: string | null
          vendor_invoice_date?: string | null
          vendor_invoice_no?: string | null
          vendor_name?: string | null
          vendor_no?: string
          vendor_order_no?: string | null
          your_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_note_source_inward_gate_entry_id_fkey"
            columns: ["source_inward_gate_entry_id"]
            isOneToOne: false
            referencedRelation: "inward_gate_entry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_note_source_purchase_order_id_fkey"
            columns: ["source_purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_order"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipt_note_line: {
        Row: {
          actual_quantity: number
          alternet_unit: number
          approved_qty: number
          bin_code: string | null
          contractor_name: string | null
          contractor_no: string | null
          created_at: string
          current_stock: number
          custom_duty_amount: number
          department_code: string | null
          depreciation_book_code: string | null
          direct_unit_cost_excl_vat: number
          exempted: boolean
          expected_receipt_date: string | null
          final_weight: number
          foc: boolean
          goods_receipt_note_id: string
          gross_weight: number
          hsn_sac_code: string | null
          id: string
          item_charge_qty_to_handle: number
          item_description: string | null
          item_no: string
          item_reference_no: string | null
          line_amount: number
          line_discount_pct: number
          line_no: number
          location_code: string | null
          net_weight: number
          planned_receipt_date: string | null
          po_line_id: string | null
          promised_receipt_date: string | null
          qty_assigned: number
          qty_in_bag: number
          qty_to_assign: number
          qty_to_invoice: number
          qty_to_receive: number
          quantity: number
          quantity_invoiced: number
          quantity_received: number
          recive_bag: number
          reject_bag: number
          rejected_qty: number
          reserved_quantity: number
          tds_section_code: string | null
          tr_wt: number
          type: string
          unit_of_measure_code: string | null
          updated_at: string
          variant_code: string | null
        }
        Insert: {
          actual_quantity?: number
          alternet_unit?: number
          approved_qty?: number
          bin_code?: string | null
          contractor_name?: string | null
          contractor_no?: string | null
          created_at?: string
          current_stock?: number
          custom_duty_amount?: number
          department_code?: string | null
          depreciation_book_code?: string | null
          direct_unit_cost_excl_vat?: number
          exempted?: boolean
          expected_receipt_date?: string | null
          final_weight?: number
          foc?: boolean
          goods_receipt_note_id: string
          gross_weight?: number
          hsn_sac_code?: string | null
          id?: string
          item_charge_qty_to_handle?: number
          item_description?: string | null
          item_no: string
          item_reference_no?: string | null
          line_amount?: number
          line_discount_pct?: number
          line_no: number
          location_code?: string | null
          net_weight?: number
          planned_receipt_date?: string | null
          po_line_id?: string | null
          promised_receipt_date?: string | null
          qty_assigned?: number
          qty_in_bag?: number
          qty_to_assign?: number
          qty_to_invoice?: number
          qty_to_receive?: number
          quantity?: number
          quantity_invoiced?: number
          quantity_received?: number
          recive_bag?: number
          reject_bag?: number
          rejected_qty?: number
          reserved_quantity?: number
          tds_section_code?: string | null
          tr_wt?: number
          type?: string
          unit_of_measure_code?: string | null
          updated_at?: string
          variant_code?: string | null
        }
        Update: {
          actual_quantity?: number
          alternet_unit?: number
          approved_qty?: number
          bin_code?: string | null
          contractor_name?: string | null
          contractor_no?: string | null
          created_at?: string
          current_stock?: number
          custom_duty_amount?: number
          department_code?: string | null
          depreciation_book_code?: string | null
          direct_unit_cost_excl_vat?: number
          exempted?: boolean
          expected_receipt_date?: string | null
          final_weight?: number
          foc?: boolean
          goods_receipt_note_id?: string
          gross_weight?: number
          hsn_sac_code?: string | null
          id?: string
          item_charge_qty_to_handle?: number
          item_description?: string | null
          item_no?: string
          item_reference_no?: string | null
          line_amount?: number
          line_discount_pct?: number
          line_no?: number
          location_code?: string | null
          net_weight?: number
          planned_receipt_date?: string | null
          po_line_id?: string | null
          promised_receipt_date?: string | null
          qty_assigned?: number
          qty_in_bag?: number
          qty_to_assign?: number
          qty_to_invoice?: number
          qty_to_receive?: number
          quantity?: number
          quantity_invoiced?: number
          quantity_received?: number
          recive_bag?: number
          reject_bag?: number
          rejected_qty?: number
          reserved_quantity?: number
          tds_section_code?: string | null
          tr_wt?: number
          type?: string
          unit_of_measure_code?: string | null
          updated_at?: string
          variant_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_note_line_goods_receipt_note_id_fkey"
            columns: ["goods_receipt_note_id"]
            isOneToOne: false
            referencedRelation: "goods_receipt_note"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_note_line_po_line_id_fkey"
            columns: ["po_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_line"
            referencedColumns: ["id"]
          },
        ]
      }
      inward_gate_entry: {
        Row: {
          challan_no: string | null
          created_at: string
          description: string | null
          document_date: string
          document_no: string
          entry_type: string
          id: string
          location_code: string | null
          lr_date: string | null
          lr_no: string | null
          posting_date: string
          source_purchase_order_id: string | null
          status: Database["public"]["Enums"]["inward_gate_entry_status"]
          updated_at: string
          vehicle_no: string | null
          vendor_name: string | null
          vendor_no: string
        }
        Insert: {
          challan_no?: string | null
          created_at?: string
          description?: string | null
          document_date?: string
          document_no: string
          entry_type?: string
          id?: string
          location_code?: string | null
          lr_date?: string | null
          lr_no?: string | null
          posting_date?: string
          source_purchase_order_id?: string | null
          status?: Database["public"]["Enums"]["inward_gate_entry_status"]
          updated_at?: string
          vehicle_no?: string | null
          vendor_name?: string | null
          vendor_no: string
        }
        Update: {
          challan_no?: string | null
          created_at?: string
          description?: string | null
          document_date?: string
          document_no?: string
          entry_type?: string
          id?: string
          location_code?: string | null
          lr_date?: string | null
          lr_no?: string | null
          posting_date?: string
          source_purchase_order_id?: string | null
          status?: Database["public"]["Enums"]["inward_gate_entry_status"]
          updated_at?: string
          vehicle_no?: string | null
          vendor_name?: string | null
          vendor_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "inward_gate_entry_source_purchase_order_id_fkey"
            columns: ["source_purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_order"
            referencedColumns: ["id"]
          },
        ]
      }
      inward_gate_entry_line: {
        Row: {
          created_at: string
          excess_weight: number | null
          first_weight: number
          id: string
          inward_gate_entry_id: string
          item_description: string | null
          item_no: string
          line_no: number
          net_quantity: number | null
          po_line_id: string | null
          po_pending_quantity: number
          po_quantity: number
          second_weight: number
          unit_of_measure: string | null
          updated_at: string
          variant_code: string | null
          vendor_weight: number
        }
        Insert: {
          created_at?: string
          excess_weight?: number | null
          first_weight?: number
          id?: string
          inward_gate_entry_id: string
          item_description?: string | null
          item_no: string
          line_no: number
          net_quantity?: number | null
          po_line_id?: string | null
          po_pending_quantity?: number
          po_quantity?: number
          second_weight?: number
          unit_of_measure?: string | null
          updated_at?: string
          variant_code?: string | null
          vendor_weight?: number
        }
        Update: {
          created_at?: string
          excess_weight?: number | null
          first_weight?: number
          id?: string
          inward_gate_entry_id?: string
          item_description?: string | null
          item_no?: string
          line_no?: number
          net_quantity?: number | null
          po_line_id?: string | null
          po_pending_quantity?: number
          po_quantity?: number
          second_weight?: number
          unit_of_measure?: string | null
          updated_at?: string
          variant_code?: string | null
          vendor_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "inward_gate_entry_line_inward_gate_entry_id_fkey"
            columns: ["inward_gate_entry_id"]
            isOneToOne: false
            referencedRelation: "inward_gate_entry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inward_gate_entry_line_po_line_id_fkey"
            columns: ["po_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_line"
            referencedColumns: ["id"]
          },
        ]
      }
      inward_gate_entry_quality: {
        Row: {
          actual_value: number | null
          created_at: string
          id: string
          inward_gate_entry_id: string
          inward_gate_entry_line_id: string
          item_id: string | null
          item_no: string
          posted_purchase_receipt_id: string | null
          posted_purchase_receipt_line_id: string | null
          quality_from: number
          quality_specific: string
          quality_stage: string
          quality_to: number
          quality_type: string
          remarks: string | null
          result: string | null
          section_code: string | null
          spec_id: string | null
          standard_value: number | null
          unit_of_measure_code: string | null
          updated_at: string
        }
        Insert: {
          actual_value?: number | null
          created_at?: string
          id?: string
          inward_gate_entry_id: string
          inward_gate_entry_line_id: string
          item_id?: string | null
          item_no: string
          posted_purchase_receipt_id?: string | null
          posted_purchase_receipt_line_id?: string | null
          quality_from?: number
          quality_specific: string
          quality_stage?: string
          quality_to?: number
          quality_type?: string
          remarks?: string | null
          result?: string | null
          section_code?: string | null
          spec_id?: string | null
          standard_value?: number | null
          unit_of_measure_code?: string | null
          updated_at?: string
        }
        Update: {
          actual_value?: number | null
          created_at?: string
          id?: string
          inward_gate_entry_id?: string
          inward_gate_entry_line_id?: string
          item_id?: string | null
          item_no?: string
          posted_purchase_receipt_id?: string | null
          posted_purchase_receipt_line_id?: string | null
          quality_from?: number
          quality_specific?: string
          quality_stage?: string
          quality_to?: number
          quality_type?: string
          remarks?: string | null
          result?: string | null
          section_code?: string | null
          spec_id?: string | null
          standard_value?: number | null
          unit_of_measure_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      item_ledger_entry: {
        Row: {
          cost_amount: number
          created_at: string
          customer_name: string | null
          customer_no: string | null
          description: string | null
          document_no: string
          document_type: string | null
          entry_no: number
          entry_type: string
          id: string
          invoiced_quantity: number
          item_no: string
          location_code: string | null
          open: boolean
          posting_date: string
          quantity: number
          remaining_quantity: number
          sales_amount: number
          source_id: string | null
          source_line_id: string | null
          unit_cost: number
          unit_of_measure_code: string | null
          unit_price: number
          updated_at: string
          variant_code: string | null
          vendor_name: string | null
          vendor_no: string | null
        }
        Insert: {
          cost_amount?: number
          created_at?: string
          customer_name?: string | null
          customer_no?: string | null
          description?: string | null
          document_no: string
          document_type?: string | null
          entry_no?: number
          entry_type: string
          id?: string
          invoiced_quantity?: number
          item_no: string
          location_code?: string | null
          open?: boolean
          posting_date: string
          quantity?: number
          remaining_quantity?: number
          sales_amount?: number
          source_id?: string | null
          source_line_id?: string | null
          unit_cost?: number
          unit_of_measure_code?: string | null
          unit_price?: number
          updated_at?: string
          variant_code?: string | null
          vendor_name?: string | null
          vendor_no?: string | null
        }
        Update: {
          cost_amount?: number
          created_at?: string
          customer_name?: string | null
          customer_no?: string | null
          description?: string | null
          document_no?: string
          document_type?: string | null
          entry_no?: number
          entry_type?: string
          id?: string
          invoiced_quantity?: number
          item_no?: string
          location_code?: string | null
          open?: boolean
          posting_date?: string
          quantity?: number
          remaining_quantity?: number
          sales_amount?: number
          source_id?: string | null
          source_line_id?: string | null
          unit_cost?: number
          unit_of_measure_code?: string | null
          unit_price?: number
          updated_at?: string
          variant_code?: string | null
          vendor_name?: string | null
          vendor_no?: string | null
        }
        Relationships: []
      }
      item_location_inventory: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_no: string
          location_code: string
          quantity: number
          updated_at: string
          variant_code: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_no: string
          location_code: string
          quantity?: number
          updated_at?: string
          variant_code?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_no?: string
          location_code?: string
          quantity?: number
          updated_at?: string
          variant_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_location_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_quality_spec: {
        Row: {
          created_at: string
          id: string
          item_id: string
          quality_from: number
          quality_specific: string
          quality_to: number
          quality_type: string
          section_code: string | null
          standard_value: number | null
          unit_of_measure_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          quality_from?: number
          quality_specific: string
          quality_to?: number
          quality_type?: string
          section_code?: string | null
          standard_value?: number | null
          unit_of_measure_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          quality_from?: number
          quality_specific?: string
          quality_to?: number
          quality_type?: string
          section_code?: string | null
          standard_value?: number | null
          unit_of_measure_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_quality_spec_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_variant: {
        Row: {
          blocked: boolean
          code: string
          created_at: string
          description: string | null
          description_2: string | null
          id: string
          item_id: string
          item_no: string
          unit_of_measure_code: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          blocked?: boolean
          code: string
          created_at?: string
          description?: string | null
          description_2?: string | null
          id?: string
          item_id: string
          item_no: string
          unit_of_measure_code?: string | null
          updated_at?: string
          weight?: number
        }
        Update: {
          blocked?: boolean
          code?: string
          created_at?: string
          description?: string | null
          description_2?: string | null
          id?: string
          item_id?: string
          item_no?: string
          unit_of_measure_code?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_variant_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          allow_whse_overpick: boolean
          assembly_bom: string | null
          assembly_policy: string | null
          automatic_ext_texts: boolean
          base_unit_of_measure: string | null
          blocked: boolean
          brand_name: string | null
          by_product_cost: number
          common_item_no: string | null
          cost_is_adjusted: boolean
          cost_is_posted_to_gl: boolean
          costing_method: string | null
          created_at: string
          created_from_catalog_item: boolean
          critical: boolean
          default_deferral_template: string | null
          description: string
          description_2: string | null
          exempted: boolean
          expiration_calculation: string | null
          flushing_method: string | null
          gross_weight: number
          gtin: string | null
          hsn_sac_code: string | null
          id: string
          include_inventory: boolean
          indirect_cost_pct: number
          inventory: number
          is_by_product: boolean
          item_category_code: string | null
          item_no: string
          item_tracking_code: string | null
          last_counting_period_update: string | null
          last_date_modified: string | null
          last_direct_cost: number
          last_phys_invt_date: string | null
          lead_time_calculation: string | null
          lot_accumulation_period: string | null
          lot_nos: string | null
          lot_size: number
          manufacturing_policy: string | null
          maximum_inventory: number
          maximum_order_quantity: number
          minimum_order_quantity: number
          net_invoiced_qty: number
          net_weight: number
          next_counting_end_date: string | null
          next_counting_start_date: string | null
          order_multiple: number
          order_tracking_policy: string | null
          over_receipt_code: string | null
          phys_invt_counting_period_code: string | null
          prevent_negative_inventory: string | null
          production_blocked: string | null
          production_bom_no: string | null
          profit_pct: number
          purch_unit_of_measure: string | null
          purchase_tolerance_pct: number
          purchasing_blocked: boolean
          purchasing_code: string | null
          put_away_template_code: string | null
          put_away_unit_of_measure_code: string | null
          qty_on_asm_component: number
          qty_on_assembly_order: number
          qty_on_component_lines: number
          qty_on_prod_order: number
          qty_on_project_order: number
          qty_on_purch_order: number
          qty_on_sales_order: number
          qty_on_service_order: number
          quality_to_be_done: boolean
          reorder_point: number
          reorder_quantity: number
          reordering_policy: string | null
          replenishment_system: string | null
          report_unit_of_measure: string | null
          rescheduling_period: string | null
          rounding_precision: number
          routing_no: string | null
          safety_lead_time: string | null
          safety_stock_quantity: number
          sales_blocked: boolean
          sales_tolerance_pct: number
          sales_unit_of_measure: string | null
          scrap_pct: number
          search_description: string | null
          serial_nos: string | null
          service_blocked: boolean
          shelf_no: string | null
          standard_cost: number
          stockkeeping_unit_exists: boolean
          stockout_warning: string | null
          sub_category_code: string | null
          sub_comp_location: string | null
          subcontracting: boolean
          subscription_option: string | null
          type: string
          unit_cost: number
          unit_price: number
          unit_volume: number
          updated_at: string
          variant_mandatory_if_exists: string | null
          vendor_item_no: string | null
          vendor_no: string | null
          warehouse_class_code: string | null
        }
        Insert: {
          allow_whse_overpick?: boolean
          assembly_bom?: string | null
          assembly_policy?: string | null
          automatic_ext_texts?: boolean
          base_unit_of_measure?: string | null
          blocked?: boolean
          brand_name?: string | null
          by_product_cost?: number
          common_item_no?: string | null
          cost_is_adjusted?: boolean
          cost_is_posted_to_gl?: boolean
          costing_method?: string | null
          created_at?: string
          created_from_catalog_item?: boolean
          critical?: boolean
          default_deferral_template?: string | null
          description: string
          description_2?: string | null
          exempted?: boolean
          expiration_calculation?: string | null
          flushing_method?: string | null
          gross_weight?: number
          gtin?: string | null
          hsn_sac_code?: string | null
          id?: string
          include_inventory?: boolean
          indirect_cost_pct?: number
          inventory?: number
          is_by_product?: boolean
          item_category_code?: string | null
          item_no: string
          item_tracking_code?: string | null
          last_counting_period_update?: string | null
          last_date_modified?: string | null
          last_direct_cost?: number
          last_phys_invt_date?: string | null
          lead_time_calculation?: string | null
          lot_accumulation_period?: string | null
          lot_nos?: string | null
          lot_size?: number
          manufacturing_policy?: string | null
          maximum_inventory?: number
          maximum_order_quantity?: number
          minimum_order_quantity?: number
          net_invoiced_qty?: number
          net_weight?: number
          next_counting_end_date?: string | null
          next_counting_start_date?: string | null
          order_multiple?: number
          order_tracking_policy?: string | null
          over_receipt_code?: string | null
          phys_invt_counting_period_code?: string | null
          prevent_negative_inventory?: string | null
          production_blocked?: string | null
          production_bom_no?: string | null
          profit_pct?: number
          purch_unit_of_measure?: string | null
          purchase_tolerance_pct?: number
          purchasing_blocked?: boolean
          purchasing_code?: string | null
          put_away_template_code?: string | null
          put_away_unit_of_measure_code?: string | null
          qty_on_asm_component?: number
          qty_on_assembly_order?: number
          qty_on_component_lines?: number
          qty_on_prod_order?: number
          qty_on_project_order?: number
          qty_on_purch_order?: number
          qty_on_sales_order?: number
          qty_on_service_order?: number
          quality_to_be_done?: boolean
          reorder_point?: number
          reorder_quantity?: number
          reordering_policy?: string | null
          replenishment_system?: string | null
          report_unit_of_measure?: string | null
          rescheduling_period?: string | null
          rounding_precision?: number
          routing_no?: string | null
          safety_lead_time?: string | null
          safety_stock_quantity?: number
          sales_blocked?: boolean
          sales_tolerance_pct?: number
          sales_unit_of_measure?: string | null
          scrap_pct?: number
          search_description?: string | null
          serial_nos?: string | null
          service_blocked?: boolean
          shelf_no?: string | null
          standard_cost?: number
          stockkeeping_unit_exists?: boolean
          stockout_warning?: string | null
          sub_category_code?: string | null
          sub_comp_location?: string | null
          subcontracting?: boolean
          subscription_option?: string | null
          type?: string
          unit_cost?: number
          unit_price?: number
          unit_volume?: number
          updated_at?: string
          variant_mandatory_if_exists?: string | null
          vendor_item_no?: string | null
          vendor_no?: string | null
          warehouse_class_code?: string | null
        }
        Update: {
          allow_whse_overpick?: boolean
          assembly_bom?: string | null
          assembly_policy?: string | null
          automatic_ext_texts?: boolean
          base_unit_of_measure?: string | null
          blocked?: boolean
          brand_name?: string | null
          by_product_cost?: number
          common_item_no?: string | null
          cost_is_adjusted?: boolean
          cost_is_posted_to_gl?: boolean
          costing_method?: string | null
          created_at?: string
          created_from_catalog_item?: boolean
          critical?: boolean
          default_deferral_template?: string | null
          description?: string
          description_2?: string | null
          exempted?: boolean
          expiration_calculation?: string | null
          flushing_method?: string | null
          gross_weight?: number
          gtin?: string | null
          hsn_sac_code?: string | null
          id?: string
          include_inventory?: boolean
          indirect_cost_pct?: number
          inventory?: number
          is_by_product?: boolean
          item_category_code?: string | null
          item_no?: string
          item_tracking_code?: string | null
          last_counting_period_update?: string | null
          last_date_modified?: string | null
          last_direct_cost?: number
          last_phys_invt_date?: string | null
          lead_time_calculation?: string | null
          lot_accumulation_period?: string | null
          lot_nos?: string | null
          lot_size?: number
          manufacturing_policy?: string | null
          maximum_inventory?: number
          maximum_order_quantity?: number
          minimum_order_quantity?: number
          net_invoiced_qty?: number
          net_weight?: number
          next_counting_end_date?: string | null
          next_counting_start_date?: string | null
          order_multiple?: number
          order_tracking_policy?: string | null
          over_receipt_code?: string | null
          phys_invt_counting_period_code?: string | null
          prevent_negative_inventory?: string | null
          production_blocked?: string | null
          production_bom_no?: string | null
          profit_pct?: number
          purch_unit_of_measure?: string | null
          purchase_tolerance_pct?: number
          purchasing_blocked?: boolean
          purchasing_code?: string | null
          put_away_template_code?: string | null
          put_away_unit_of_measure_code?: string | null
          qty_on_asm_component?: number
          qty_on_assembly_order?: number
          qty_on_component_lines?: number
          qty_on_prod_order?: number
          qty_on_project_order?: number
          qty_on_purch_order?: number
          qty_on_sales_order?: number
          qty_on_service_order?: number
          quality_to_be_done?: boolean
          reorder_point?: number
          reorder_quantity?: number
          reordering_policy?: string | null
          replenishment_system?: string | null
          report_unit_of_measure?: string | null
          rescheduling_period?: string | null
          rounding_precision?: number
          routing_no?: string | null
          safety_lead_time?: string | null
          safety_stock_quantity?: number
          sales_blocked?: boolean
          sales_tolerance_pct?: number
          sales_unit_of_measure?: string | null
          scrap_pct?: number
          search_description?: string | null
          serial_nos?: string | null
          service_blocked?: boolean
          shelf_no?: string | null
          standard_cost?: number
          stockkeeping_unit_exists?: boolean
          stockout_warning?: string | null
          sub_category_code?: string | null
          sub_comp_location?: string | null
          subcontracting?: boolean
          subscription_option?: string | null
          type?: string
          unit_cost?: number
          unit_price?: number
          unit_volume?: number
          updated_at?: string
          variant_mandatory_if_exists?: string | null
          vendor_item_no?: string | null
          vendor_no?: string | null
          warehouse_class_code?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          state_code: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          state_code?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          state_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mandi_master: {
        Row: {
          bardana_weight: number
          cancer_fund: number
          commission: number
          created_at: string
          dalali: number
          dammi: number
          date: string
          expected_qty: number
          expected_rate: number
          fill_up_time: string | null
          hrdf: number
          id: string
          initial_update_time: string | null
          item_description: string | null
          item_no: string
          loading_stiching: number
          mandi_dhara_fof_payment: number
          mandi_labour: number
          market_fees: number
          per_pack_qty: number
          starting_date: string | null
          today_purchase_quantity: number
          today_purchase_rate: number
          updated_at: string
          variant_code: string | null
          vendor_name: string | null
          vendor_no: string
        }
        Insert: {
          bardana_weight?: number
          cancer_fund?: number
          commission?: number
          created_at?: string
          dalali?: number
          dammi?: number
          date: string
          expected_qty?: number
          expected_rate?: number
          fill_up_time?: string | null
          hrdf?: number
          id?: string
          initial_update_time?: string | null
          item_description?: string | null
          item_no: string
          loading_stiching?: number
          mandi_dhara_fof_payment?: number
          mandi_labour?: number
          market_fees?: number
          per_pack_qty?: number
          starting_date?: string | null
          today_purchase_quantity?: number
          today_purchase_rate?: number
          updated_at?: string
          variant_code?: string | null
          vendor_name?: string | null
          vendor_no: string
        }
        Update: {
          bardana_weight?: number
          cancer_fund?: number
          commission?: number
          created_at?: string
          dalali?: number
          dammi?: number
          date?: string
          expected_qty?: number
          expected_rate?: number
          fill_up_time?: string | null
          hrdf?: number
          id?: string
          initial_update_time?: string | null
          item_description?: string | null
          item_no?: string
          loading_stiching?: number
          mandi_dhara_fof_payment?: number
          mandi_labour?: number
          market_fees?: number
          per_pack_qty?: number
          starting_date?: string | null
          today_purchase_quantity?: number
          today_purchase_rate?: number
          updated_at?: string
          variant_code?: string | null
          vendor_name?: string | null
          vendor_no?: string
        }
        Relationships: []
      }
      mandi_purchase: {
        Row: {
          challan_no: string | null
          created_at: string
          document_no: string
          id: string
          name: string | null
          po_no: string | null
          posting_date: string
          purchaser_name: string | null
          remarks: string | null
          serial_no: string | null
          status: Database["public"]["Enums"]["mandi_purchase_status"]
          updated_at: string
          vendor_name: string | null
          vendor_no: string
        }
        Insert: {
          challan_no?: string | null
          created_at?: string
          document_no: string
          id?: string
          name?: string | null
          po_no?: string | null
          posting_date?: string
          purchaser_name?: string | null
          remarks?: string | null
          serial_no?: string | null
          status?: Database["public"]["Enums"]["mandi_purchase_status"]
          updated_at?: string
          vendor_name?: string | null
          vendor_no: string
        }
        Update: {
          challan_no?: string | null
          created_at?: string
          document_no?: string
          id?: string
          name?: string | null
          po_no?: string | null
          posting_date?: string
          purchaser_name?: string | null
          remarks?: string | null
          serial_no?: string | null
          status?: Database["public"]["Enums"]["mandi_purchase_status"]
          updated_at?: string
          vendor_name?: string | null
          vendor_no?: string
        }
        Relationships: []
      }
      mandi_purchase_attachment: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          mandi_purchase_id: string
          mime_type: string | null
          size_bytes: number | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          mandi_purchase_id: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          mandi_purchase_id?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mandi_purchase_attachment_mandi_purchase_id_fkey"
            columns: ["mandi_purchase_id"]
            isOneToOne: false
            referencedRelation: "mandi_purchase"
            referencedColumns: ["id"]
          },
        ]
      }
      mandi_purchase_line: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          item_description: string | null
          item_no: string
          line_no: number
          mandi_purchase_id: string
          mandi_vendor_name: string | null
          mandi_vendor_no: string | null
          quantity: number
          rate: number
          updated_at: string
          variant_code: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          item_description?: string | null
          item_no: string
          line_no: number
          mandi_purchase_id: string
          mandi_vendor_name?: string | null
          mandi_vendor_no?: string | null
          quantity?: number
          rate?: number
          updated_at?: string
          variant_code?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          item_description?: string | null
          item_no?: string
          line_no?: number
          mandi_purchase_id?: string
          mandi_vendor_name?: string | null
          mandi_vendor_no?: string | null
          quantity?: number
          rate?: number
          updated_at?: string
          variant_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mandi_purchase_line_mandi_purchase_id_fkey"
            columns: ["mandi_purchase_id"]
            isOneToOne: false
            referencedRelation: "mandi_purchase"
            referencedColumns: ["id"]
          },
        ]
      }
      mandi_vendor: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone_no: string | null
          updated_at: string
          vendor_no: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone_no?: string | null
          updated_at?: string
          vendor_no: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone_no?: string | null
          updated_at?: string
          vendor_no?: string
        }
        Relationships: []
      }
      number_series: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          last_no_used: number
          padding: number
          prefix: string
          starting_date: string
          starting_no: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          last_no_used?: number
          padding?: number
          prefix?: string
          starting_date?: string
          starting_no?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          last_no_used?: number
          padding?: number
          prefix?: string
          starting_date?: string
          starting_no?: number
          updated_at?: string
        }
        Relationships: []
      }
      posted_purchase_receipt: {
        Row: {
          challan_no: string | null
          created_at: string
          description: string | null
          document_date: string
          document_no: string
          entry_type: string | null
          id: string
          location_code: string | null
          lr_date: string | null
          lr_no: string | null
          posting_date: string
          source_inward_gate_entry_id: string | null
          source_purchase_order_id: string | null
          updated_at: string
          vehicle_no: string | null
          vendor_name: string | null
          vendor_no: string
        }
        Insert: {
          challan_no?: string | null
          created_at?: string
          description?: string | null
          document_date?: string
          document_no: string
          entry_type?: string | null
          id?: string
          location_code?: string | null
          lr_date?: string | null
          lr_no?: string | null
          posting_date?: string
          source_inward_gate_entry_id?: string | null
          source_purchase_order_id?: string | null
          updated_at?: string
          vehicle_no?: string | null
          vendor_name?: string | null
          vendor_no: string
        }
        Update: {
          challan_no?: string | null
          created_at?: string
          description?: string | null
          document_date?: string
          document_no?: string
          entry_type?: string | null
          id?: string
          location_code?: string | null
          lr_date?: string | null
          lr_no?: string | null
          posting_date?: string
          source_inward_gate_entry_id?: string | null
          source_purchase_order_id?: string | null
          updated_at?: string
          vehicle_no?: string | null
          vendor_name?: string | null
          vendor_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "posted_purchase_receipt_source_inward_gate_entry_id_fkey"
            columns: ["source_inward_gate_entry_id"]
            isOneToOne: false
            referencedRelation: "inward_gate_entry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posted_purchase_receipt_source_purchase_order_id_fkey"
            columns: ["source_purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_order"
            referencedColumns: ["id"]
          },
        ]
      }
      posted_purchase_receipt_line: {
        Row: {
          created_at: string
          excess_weight: number
          first_weight: number
          id: string
          item_description: string | null
          item_no: string
          line_no: number
          net_quantity: number
          po_line_id: string | null
          posted_purchase_receipt_id: string
          quantity_received: number
          second_weight: number
          unit_of_measure: string | null
          updated_at: string
          variant_code: string | null
          vendor_weight: number
        }
        Insert: {
          created_at?: string
          excess_weight?: number
          first_weight?: number
          id?: string
          item_description?: string | null
          item_no: string
          line_no: number
          net_quantity?: number
          po_line_id?: string | null
          posted_purchase_receipt_id: string
          quantity_received?: number
          second_weight?: number
          unit_of_measure?: string | null
          updated_at?: string
          variant_code?: string | null
          vendor_weight?: number
        }
        Update: {
          created_at?: string
          excess_weight?: number
          first_weight?: number
          id?: string
          item_description?: string | null
          item_no?: string
          line_no?: number
          net_quantity?: number
          po_line_id?: string | null
          posted_purchase_receipt_id?: string
          quantity_received?: number
          second_weight?: number
          unit_of_measure?: string | null
          updated_at?: string
          variant_code?: string | null
          vendor_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "posted_purchase_receipt_line_po_line_id_fkey"
            columns: ["po_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_line"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posted_purchase_receipt_line_posted_purchase_receipt_id_fkey"
            columns: ["posted_purchase_receipt_id"]
            isOneToOne: false
            referencedRelation: "posted_purchase_receipt"
            referencedColumns: ["id"]
          },
        ]
      }
      posted_sales_shipment: {
        Row: {
          address: string | null
          city: string | null
          contact: string | null
          country_region_code: string | null
          created_at: string
          customer_name: string | null
          customer_no: string
          document_date: string
          document_no: string
          external_document_no: string | null
          id: string
          location_code: string | null
          narration: string | null
          phone_no: string | null
          post_code: string | null
          posting_date: string
          salesperson_code: string | null
          shipment_date: string
          shipment_method_code: string | null
          source_sales_order_id: string | null
          source_sales_order_no: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact?: string | null
          country_region_code?: string | null
          created_at?: string
          customer_name?: string | null
          customer_no: string
          document_date?: string
          document_no: string
          external_document_no?: string | null
          id?: string
          location_code?: string | null
          narration?: string | null
          phone_no?: string | null
          post_code?: string | null
          posting_date?: string
          salesperson_code?: string | null
          shipment_date?: string
          shipment_method_code?: string | null
          source_sales_order_id?: string | null
          source_sales_order_no?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact?: string | null
          country_region_code?: string | null
          created_at?: string
          customer_name?: string | null
          customer_no?: string
          document_date?: string
          document_no?: string
          external_document_no?: string | null
          id?: string
          location_code?: string | null
          narration?: string | null
          phone_no?: string | null
          post_code?: string | null
          posting_date?: string
          salesperson_code?: string | null
          shipment_date?: string
          shipment_method_code?: string | null
          source_sales_order_id?: string | null
          source_sales_order_no?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posted_sales_shipment_source_sales_order_id_fkey"
            columns: ["source_sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_order"
            referencedColumns: ["id"]
          },
        ]
      }
      posted_sales_shipment_line: {
        Row: {
          created_at: string
          id: string
          item_description: string | null
          item_no: string
          line_amount: number
          line_no: number
          location_code: string | null
          posted_sales_shipment_id: string
          quantity_shipped: number
          remaining_quantity: number
          so_line_id: string | null
          unit_of_measure_code: string | null
          unit_price: number
          updated_at: string
          variant_code: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_description?: string | null
          item_no: string
          line_amount?: number
          line_no: number
          location_code?: string | null
          posted_sales_shipment_id: string
          quantity_shipped?: number
          remaining_quantity?: number
          so_line_id?: string | null
          unit_of_measure_code?: string | null
          unit_price?: number
          updated_at?: string
          variant_code?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_description?: string | null
          item_no?: string
          line_amount?: number
          line_no?: number
          location_code?: string | null
          posted_sales_shipment_id?: string
          quantity_shipped?: number
          remaining_quantity?: number
          so_line_id?: string | null
          unit_of_measure_code?: string | null
          unit_price?: number
          updated_at?: string
          variant_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posted_sales_shipment_line_posted_sales_shipment_id_fkey"
            columns: ["posted_sales_shipment_id"]
            isOneToOne: false
            referencedRelation: "posted_sales_shipment"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order: {
        Row: {
          address: string | null
          address_2: string | null
          alternate_vendor_address_code: string | null
          broker_code: string | null
          broker_name: string | null
          brokerage: number
          cash_discount: number
          charge_group_code: string | null
          city: string | null
          contact: string | null
          country_region_code: string | null
          created_at: string
          creditor_no: string | null
          currency_code: string | null
          deduction: number
          delivery_terms: string | null
          department_code: string | null
          discount: number
          document_date: string | null
          document_no: string
          due_date: string | null
          email: string | null
          expected_receipt_date: string | null
          id: string
          include_gst_in_tds_base: boolean
          invoice_received_date: string | null
          linked_with_e_document: boolean
          location_code: string | null
          mobile_phone_no: string | null
          narration: string | null
          on_hold: string | null
          order_date: string | null
          order_type: string | null
          payment_discount_pct: number
          payment_method_code: string | null
          payment_reference: string | null
          payment_terms_code: string | null
          phone_no: string | null
          post_code: string | null
          posting_date: string
          prepared_by: string | null
          prices_including_vat: boolean
          promised_receipt_date: string | null
          purchaser_code: string | null
          quote_no: string | null
          receiving_no: string | null
          receiving_no_series: string | null
          referred_by: string | null
          referred_by_phone_no: string | null
          remaining_tds_cert_value: number
          requested_receipt_date: string | null
          shipment_method_code: string | null
          source_mandi_purchase_id: string | null
          status: Database["public"]["Enums"]["purchase_order_status"]
          updated_at: string
          vat_date: string | null
          vendor_gst_reg_no: string | null
          vendor_invoice_date: string | null
          vendor_invoice_no: string | null
          vendor_name: string | null
          vendor_no: string
          vendor_order_no: string | null
          your_reference: string | null
        }
        Insert: {
          address?: string | null
          address_2?: string | null
          alternate_vendor_address_code?: string | null
          broker_code?: string | null
          broker_name?: string | null
          brokerage?: number
          cash_discount?: number
          charge_group_code?: string | null
          city?: string | null
          contact?: string | null
          country_region_code?: string | null
          created_at?: string
          creditor_no?: string | null
          currency_code?: string | null
          deduction?: number
          delivery_terms?: string | null
          department_code?: string | null
          discount?: number
          document_date?: string | null
          document_no: string
          due_date?: string | null
          email?: string | null
          expected_receipt_date?: string | null
          id?: string
          include_gst_in_tds_base?: boolean
          invoice_received_date?: string | null
          linked_with_e_document?: boolean
          location_code?: string | null
          mobile_phone_no?: string | null
          narration?: string | null
          on_hold?: string | null
          order_date?: string | null
          order_type?: string | null
          payment_discount_pct?: number
          payment_method_code?: string | null
          payment_reference?: string | null
          payment_terms_code?: string | null
          phone_no?: string | null
          post_code?: string | null
          posting_date?: string
          prepared_by?: string | null
          prices_including_vat?: boolean
          promised_receipt_date?: string | null
          purchaser_code?: string | null
          quote_no?: string | null
          receiving_no?: string | null
          receiving_no_series?: string | null
          referred_by?: string | null
          referred_by_phone_no?: string | null
          remaining_tds_cert_value?: number
          requested_receipt_date?: string | null
          shipment_method_code?: string | null
          source_mandi_purchase_id?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"]
          updated_at?: string
          vat_date?: string | null
          vendor_gst_reg_no?: string | null
          vendor_invoice_date?: string | null
          vendor_invoice_no?: string | null
          vendor_name?: string | null
          vendor_no: string
          vendor_order_no?: string | null
          your_reference?: string | null
        }
        Update: {
          address?: string | null
          address_2?: string | null
          alternate_vendor_address_code?: string | null
          broker_code?: string | null
          broker_name?: string | null
          brokerage?: number
          cash_discount?: number
          charge_group_code?: string | null
          city?: string | null
          contact?: string | null
          country_region_code?: string | null
          created_at?: string
          creditor_no?: string | null
          currency_code?: string | null
          deduction?: number
          delivery_terms?: string | null
          department_code?: string | null
          discount?: number
          document_date?: string | null
          document_no?: string
          due_date?: string | null
          email?: string | null
          expected_receipt_date?: string | null
          id?: string
          include_gst_in_tds_base?: boolean
          invoice_received_date?: string | null
          linked_with_e_document?: boolean
          location_code?: string | null
          mobile_phone_no?: string | null
          narration?: string | null
          on_hold?: string | null
          order_date?: string | null
          order_type?: string | null
          payment_discount_pct?: number
          payment_method_code?: string | null
          payment_reference?: string | null
          payment_terms_code?: string | null
          phone_no?: string | null
          post_code?: string | null
          posting_date?: string
          prepared_by?: string | null
          prices_including_vat?: boolean
          promised_receipt_date?: string | null
          purchaser_code?: string | null
          quote_no?: string | null
          receiving_no?: string | null
          receiving_no_series?: string | null
          referred_by?: string | null
          referred_by_phone_no?: string | null
          remaining_tds_cert_value?: number
          requested_receipt_date?: string | null
          shipment_method_code?: string | null
          source_mandi_purchase_id?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"]
          updated_at?: string
          vat_date?: string | null
          vendor_gst_reg_no?: string | null
          vendor_invoice_date?: string | null
          vendor_invoice_no?: string | null
          vendor_name?: string | null
          vendor_no?: string
          vendor_order_no?: string | null
          your_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_source_mandi_purchase_id_fkey"
            columns: ["source_mandi_purchase_id"]
            isOneToOne: false
            referencedRelation: "mandi_purchase"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_line: {
        Row: {
          actual_quantity: number
          alternet_unit: number
          amount: number | null
          approved_qty: number
          bin_code: string | null
          contractor_name: string | null
          contractor_no: string | null
          created_at: string
          current_stock: number
          custom_duty_amount: number
          department_code: string | null
          depreciation_book_code: string | null
          direct_unit_cost_excl_vat: number
          exempted: boolean
          expected_receipt_date: string | null
          final_weight: number
          foc: boolean
          gross_weight: number
          hsn_sac_code: string | null
          id: string
          item_charge_qty_to_handle: number
          item_description: string | null
          item_no: string
          item_reference_no: string | null
          line_amount: number
          line_discount_pct: number
          line_no: number
          location_code: string | null
          net_weight: number
          planned_receipt_date: string | null
          promised_receipt_date: string | null
          purchase_order_id: string
          qty_assigned: number
          qty_in_bag: number
          qty_to_assign: number
          qty_to_invoice: number
          qty_to_receive: number
          quantity: number
          quantity_invoiced: number
          quantity_received: number
          rate: number
          received_quantity: number
          recive_bag: number
          reject_bag: number
          rejected_qty: number
          reserved_quantity: number
          tds_section_code: string | null
          tr_wt: number
          type: string
          unit_of_measure_code: string | null
          updated_at: string
          variant_code: string | null
        }
        Insert: {
          actual_quantity?: number
          alternet_unit?: number
          amount?: number | null
          approved_qty?: number
          bin_code?: string | null
          contractor_name?: string | null
          contractor_no?: string | null
          created_at?: string
          current_stock?: number
          custom_duty_amount?: number
          department_code?: string | null
          depreciation_book_code?: string | null
          direct_unit_cost_excl_vat?: number
          exempted?: boolean
          expected_receipt_date?: string | null
          final_weight?: number
          foc?: boolean
          gross_weight?: number
          hsn_sac_code?: string | null
          id?: string
          item_charge_qty_to_handle?: number
          item_description?: string | null
          item_no: string
          item_reference_no?: string | null
          line_amount?: number
          line_discount_pct?: number
          line_no: number
          location_code?: string | null
          net_weight?: number
          planned_receipt_date?: string | null
          promised_receipt_date?: string | null
          purchase_order_id: string
          qty_assigned?: number
          qty_in_bag?: number
          qty_to_assign?: number
          qty_to_invoice?: number
          qty_to_receive?: number
          quantity?: number
          quantity_invoiced?: number
          quantity_received?: number
          rate?: number
          received_quantity?: number
          recive_bag?: number
          reject_bag?: number
          rejected_qty?: number
          reserved_quantity?: number
          tds_section_code?: string | null
          tr_wt?: number
          type?: string
          unit_of_measure_code?: string | null
          updated_at?: string
          variant_code?: string | null
        }
        Update: {
          actual_quantity?: number
          alternet_unit?: number
          amount?: number | null
          approved_qty?: number
          bin_code?: string | null
          contractor_name?: string | null
          contractor_no?: string | null
          created_at?: string
          current_stock?: number
          custom_duty_amount?: number
          department_code?: string | null
          depreciation_book_code?: string | null
          direct_unit_cost_excl_vat?: number
          exempted?: boolean
          expected_receipt_date?: string | null
          final_weight?: number
          foc?: boolean
          gross_weight?: number
          hsn_sac_code?: string | null
          id?: string
          item_charge_qty_to_handle?: number
          item_description?: string | null
          item_no?: string
          item_reference_no?: string | null
          line_amount?: number
          line_discount_pct?: number
          line_no?: number
          location_code?: string | null
          net_weight?: number
          planned_receipt_date?: string | null
          promised_receipt_date?: string | null
          purchase_order_id?: string
          qty_assigned?: number
          qty_in_bag?: number
          qty_to_assign?: number
          qty_to_invoice?: number
          qty_to_receive?: number
          quantity?: number
          quantity_invoiced?: number
          quantity_received?: number
          rate?: number
          received_quantity?: number
          recive_bag?: number
          reject_bag?: number
          rejected_qty?: number
          reserved_quantity?: number
          tds_section_code?: string | null
          tr_wt?: number
          type?: string
          unit_of_measure_code?: string | null
          updated_at?: string
          variant_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_line_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_order"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoice: {
        Row: {
          address: string | null
          address_2: string | null
          city: string | null
          contact: string | null
          country_region_code: string | null
          created_at: string
          currency_code: string | null
          customer_gst_reg_no: string | null
          customer_name: string | null
          customer_no: string
          discount: number
          document_date: string
          document_no: string
          due_date: string | null
          email: string | null
          external_document_no: string | null
          gst_customer_type: string | null
          id: string
          location_code: string | null
          narration: string | null
          payment_method_code: string | null
          payment_terms_code: string | null
          phone_no: string | null
          post_code: string | null
          posting_date: string
          prices_including_vat: boolean
          salesperson_code: string | null
          source_sales_order_id: string | null
          status: Database["public"]["Enums"]["sales_invoice_status"]
          total_amount: number
          total_tax: number
          updated_at: string
          your_reference: string | null
        }
        Insert: {
          address?: string | null
          address_2?: string | null
          city?: string | null
          contact?: string | null
          country_region_code?: string | null
          created_at?: string
          currency_code?: string | null
          customer_gst_reg_no?: string | null
          customer_name?: string | null
          customer_no: string
          discount?: number
          document_date?: string
          document_no: string
          due_date?: string | null
          email?: string | null
          external_document_no?: string | null
          gst_customer_type?: string | null
          id?: string
          location_code?: string | null
          narration?: string | null
          payment_method_code?: string | null
          payment_terms_code?: string | null
          phone_no?: string | null
          post_code?: string | null
          posting_date?: string
          prices_including_vat?: boolean
          salesperson_code?: string | null
          source_sales_order_id?: string | null
          status?: Database["public"]["Enums"]["sales_invoice_status"]
          total_amount?: number
          total_tax?: number
          updated_at?: string
          your_reference?: string | null
        }
        Update: {
          address?: string | null
          address_2?: string | null
          city?: string | null
          contact?: string | null
          country_region_code?: string | null
          created_at?: string
          currency_code?: string | null
          customer_gst_reg_no?: string | null
          customer_name?: string | null
          customer_no?: string
          discount?: number
          document_date?: string
          document_no?: string
          due_date?: string | null
          email?: string | null
          external_document_no?: string | null
          gst_customer_type?: string | null
          id?: string
          location_code?: string | null
          narration?: string | null
          payment_method_code?: string | null
          payment_terms_code?: string | null
          phone_no?: string | null
          post_code?: string | null
          posting_date?: string
          prices_including_vat?: boolean
          salesperson_code?: string | null
          source_sales_order_id?: string | null
          status?: Database["public"]["Enums"]["sales_invoice_status"]
          total_amount?: number
          total_tax?: number
          updated_at?: string
          your_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_source_sales_order_id_fkey"
            columns: ["source_sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_order"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoice_line: {
        Row: {
          created_at: string
          gst_group_code: string | null
          hsn_sac_code: string | null
          id: string
          item_description: string | null
          item_no: string
          line_amount: number
          line_discount_pct: number
          line_no: number
          location_code: string | null
          quantity: number
          sales_invoice_id: string
          so_line_id: string | null
          tax_amount: number
          tax_pct: number
          type: string
          unit_of_measure_code: string | null
          unit_price: number
          updated_at: string
          variant_code: string | null
        }
        Insert: {
          created_at?: string
          gst_group_code?: string | null
          hsn_sac_code?: string | null
          id?: string
          item_description?: string | null
          item_no: string
          line_amount?: number
          line_discount_pct?: number
          line_no: number
          location_code?: string | null
          quantity?: number
          sales_invoice_id: string
          so_line_id?: string | null
          tax_amount?: number
          tax_pct?: number
          type?: string
          unit_of_measure_code?: string | null
          unit_price?: number
          updated_at?: string
          variant_code?: string | null
        }
        Update: {
          created_at?: string
          gst_group_code?: string | null
          hsn_sac_code?: string | null
          id?: string
          item_description?: string | null
          item_no?: string
          line_amount?: number
          line_discount_pct?: number
          line_no?: number
          location_code?: string | null
          quantity?: number
          sales_invoice_id?: string
          so_line_id?: string | null
          tax_amount?: number
          tax_pct?: number
          type?: string
          unit_of_measure_code?: string | null
          unit_price?: number
          updated_at?: string
          variant_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_line_sales_invoice_id_fkey"
            columns: ["sales_invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoice"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order: {
        Row: {
          address: string | null
          address_2: string | null
          city: string | null
          contact: string | null
          country_region_code: string | null
          created_at: string
          currency_code: string | null
          customer_gst_reg_no: string | null
          customer_name: string | null
          customer_no: string
          discount: number
          document_date: string
          document_no: string
          due_date: string | null
          email: string | null
          external_document_no: string | null
          gst_customer_type: string | null
          id: string
          location_code: string | null
          narration: string | null
          payment_method_code: string | null
          payment_terms_code: string | null
          phone_no: string | null
          post_code: string | null
          posting_date: string
          prices_including_vat: boolean
          promised_delivery_date: string | null
          requested_delivery_date: string | null
          salesperson_code: string | null
          ship_to_address: string | null
          ship_to_city: string | null
          ship_to_code: string | null
          ship_to_name: string | null
          shipment_date: string | null
          shipment_method_code: string | null
          status: Database["public"]["Enums"]["sales_order_status"]
          total_amount: number
          updated_at: string
          your_reference: string | null
        }
        Insert: {
          address?: string | null
          address_2?: string | null
          city?: string | null
          contact?: string | null
          country_region_code?: string | null
          created_at?: string
          currency_code?: string | null
          customer_gst_reg_no?: string | null
          customer_name?: string | null
          customer_no: string
          discount?: number
          document_date?: string
          document_no: string
          due_date?: string | null
          email?: string | null
          external_document_no?: string | null
          gst_customer_type?: string | null
          id?: string
          location_code?: string | null
          narration?: string | null
          payment_method_code?: string | null
          payment_terms_code?: string | null
          phone_no?: string | null
          post_code?: string | null
          posting_date?: string
          prices_including_vat?: boolean
          promised_delivery_date?: string | null
          requested_delivery_date?: string | null
          salesperson_code?: string | null
          ship_to_address?: string | null
          ship_to_city?: string | null
          ship_to_code?: string | null
          ship_to_name?: string | null
          shipment_date?: string | null
          shipment_method_code?: string | null
          status?: Database["public"]["Enums"]["sales_order_status"]
          total_amount?: number
          updated_at?: string
          your_reference?: string | null
        }
        Update: {
          address?: string | null
          address_2?: string | null
          city?: string | null
          contact?: string | null
          country_region_code?: string | null
          created_at?: string
          currency_code?: string | null
          customer_gst_reg_no?: string | null
          customer_name?: string | null
          customer_no?: string
          discount?: number
          document_date?: string
          document_no?: string
          due_date?: string | null
          email?: string | null
          external_document_no?: string | null
          gst_customer_type?: string | null
          id?: string
          location_code?: string | null
          narration?: string | null
          payment_method_code?: string | null
          payment_terms_code?: string | null
          phone_no?: string | null
          post_code?: string | null
          posting_date?: string
          prices_including_vat?: boolean
          promised_delivery_date?: string | null
          requested_delivery_date?: string | null
          salesperson_code?: string | null
          ship_to_address?: string | null
          ship_to_city?: string | null
          ship_to_code?: string | null
          ship_to_name?: string | null
          shipment_date?: string | null
          shipment_method_code?: string | null
          status?: Database["public"]["Enums"]["sales_order_status"]
          total_amount?: number
          updated_at?: string
          your_reference?: string | null
        }
        Relationships: []
      }
      sales_order_line: {
        Row: {
          created_at: string
          gst_group_code: string | null
          hsn_sac_code: string | null
          id: string
          item_description: string | null
          item_no: string
          line_amount: number
          line_discount_pct: number
          line_no: number
          location_code: string | null
          qty_invoiced: number
          qty_shipped: number
          qty_to_invoice: number
          qty_to_ship: number
          quantity: number
          sales_order_id: string
          shipment_date: string | null
          type: string
          unit_of_measure_code: string | null
          unit_price: number
          updated_at: string
          variant_code: string | null
        }
        Insert: {
          created_at?: string
          gst_group_code?: string | null
          hsn_sac_code?: string | null
          id?: string
          item_description?: string | null
          item_no: string
          line_amount?: number
          line_discount_pct?: number
          line_no: number
          location_code?: string | null
          qty_invoiced?: number
          qty_shipped?: number
          qty_to_invoice?: number
          qty_to_ship?: number
          quantity?: number
          sales_order_id: string
          shipment_date?: string | null
          type?: string
          unit_of_measure_code?: string | null
          unit_price?: number
          updated_at?: string
          variant_code?: string | null
        }
        Update: {
          created_at?: string
          gst_group_code?: string | null
          hsn_sac_code?: string | null
          id?: string
          item_description?: string | null
          item_no?: string
          line_amount?: number
          line_discount_pct?: number
          line_no?: number
          location_code?: string | null
          qty_invoiced?: number
          qty_shipped?: number
          qty_to_invoice?: number
          qty_to_ship?: number
          quantity?: number
          sales_order_id?: string
          shipment_date?: string | null
          type?: string
          unit_of_measure_code?: string | null
          unit_price?: number
          updated_at?: string
          variant_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_line_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_order"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_of_measure: {
        Row: {
          blocked: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          international_standard_code: string | null
          symbol: string | null
          updated_at: string
        }
        Insert: {
          blocked?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          international_standard_code?: string | null
          symbol?: string | null
          updated_at?: string
        }
        Update: {
          blocked?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          international_standard_code?: string | null
          symbol?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          company_logo_url: string | null
          company_name: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          address_2: string | null
          aggregate_turnover: string | null
          allow_multiple_posting_groups: boolean
          arn_no: string | null
          assessee_code: string | null
          associated_enterprises: boolean
          auction: number
          balance_due_lcy: number
          balance_lcy: number
          balance_lcy_as_customer: number
          bank_account_no: string | null
          bank_name: string | null
          bardana_weight: number
          base_calendar_code: string | null
          blocked: string | null
          cancer_fund: number
          carbon_pricing_paid: boolean
          city: string | null
          commission: number
          commissioners_permission_no: string | null
          company_size_code: string | null
          contact: string | null
          contract_person: string | null
          country_region_code: string | null
          created_at: string
          customized_calendar: string | null
          dalali: number
          dammi: number
          disable_search_by_name: boolean
          document_sending_profile: string | null
          e_document_service_participation: number
          email: string | null
          format_region: string | null
          govt_undertaking: boolean
          gst_registration_no: string | null
          gst_vendor_type: string | null
          home_page: string | null
          hrdf: number
          hrdf_pct: number
          ic_partner_code: string | null
          id: string
          ifsc_code: string | null
          language_code: string | null
          last_date_modified: string | null
          loading_stiching: number
          location_code: string | null
          mandi_dhara_fof_payment: string | null
          mandi_labour: number
          market_fees: number
          market_pct: number
          mobile_phone_no: string | null
          msme: boolean
          msme_no: string | null
          name: string
          our_account_no: string | null
          pan_no: string | null
          pan_reference_no: string | null
          pan_status: string | null
          payment_method_code: string | null
          payment_terms_code: string | null
          payment_terms_id: string | null
          payments_lcy: number
          per_pack_qty: number
          phone_no: string | null
          post_code: string | null
          prices_including_vat: boolean
          primary_contact_code: string | null
          privacy_blocked: boolean
          purchaser_code: string | null
          receive_e_document_to: string | null
          responsibility_center: string | null
          search_name: string | null
          shipment_method_code: string | null
          state_code: string | null
          subcontractor: boolean
          sustainability_certificate_name: string | null
          sustainability_certificate_no: string | null
          transporter: boolean
          updated_at: string
          vat_registration_no: string | null
          vendor_location: string | null
          vendor_no: string
        }
        Insert: {
          address?: string | null
          address_2?: string | null
          aggregate_turnover?: string | null
          allow_multiple_posting_groups?: boolean
          arn_no?: string | null
          assessee_code?: string | null
          associated_enterprises?: boolean
          auction?: number
          balance_due_lcy?: number
          balance_lcy?: number
          balance_lcy_as_customer?: number
          bank_account_no?: string | null
          bank_name?: string | null
          bardana_weight?: number
          base_calendar_code?: string | null
          blocked?: string | null
          cancer_fund?: number
          carbon_pricing_paid?: boolean
          city?: string | null
          commission?: number
          commissioners_permission_no?: string | null
          company_size_code?: string | null
          contact?: string | null
          contract_person?: string | null
          country_region_code?: string | null
          created_at?: string
          customized_calendar?: string | null
          dalali?: number
          dammi?: number
          disable_search_by_name?: boolean
          document_sending_profile?: string | null
          e_document_service_participation?: number
          email?: string | null
          format_region?: string | null
          govt_undertaking?: boolean
          gst_registration_no?: string | null
          gst_vendor_type?: string | null
          home_page?: string | null
          hrdf?: number
          hrdf_pct?: number
          ic_partner_code?: string | null
          id?: string
          ifsc_code?: string | null
          language_code?: string | null
          last_date_modified?: string | null
          loading_stiching?: number
          location_code?: string | null
          mandi_dhara_fof_payment?: string | null
          mandi_labour?: number
          market_fees?: number
          market_pct?: number
          mobile_phone_no?: string | null
          msme?: boolean
          msme_no?: string | null
          name: string
          our_account_no?: string | null
          pan_no?: string | null
          pan_reference_no?: string | null
          pan_status?: string | null
          payment_method_code?: string | null
          payment_terms_code?: string | null
          payment_terms_id?: string | null
          payments_lcy?: number
          per_pack_qty?: number
          phone_no?: string | null
          post_code?: string | null
          prices_including_vat?: boolean
          primary_contact_code?: string | null
          privacy_blocked?: boolean
          purchaser_code?: string | null
          receive_e_document_to?: string | null
          responsibility_center?: string | null
          search_name?: string | null
          shipment_method_code?: string | null
          state_code?: string | null
          subcontractor?: boolean
          sustainability_certificate_name?: string | null
          sustainability_certificate_no?: string | null
          transporter?: boolean
          updated_at?: string
          vat_registration_no?: string | null
          vendor_location?: string | null
          vendor_no: string
        }
        Update: {
          address?: string | null
          address_2?: string | null
          aggregate_turnover?: string | null
          allow_multiple_posting_groups?: boolean
          arn_no?: string | null
          assessee_code?: string | null
          associated_enterprises?: boolean
          auction?: number
          balance_due_lcy?: number
          balance_lcy?: number
          balance_lcy_as_customer?: number
          bank_account_no?: string | null
          bank_name?: string | null
          bardana_weight?: number
          base_calendar_code?: string | null
          blocked?: string | null
          cancer_fund?: number
          carbon_pricing_paid?: boolean
          city?: string | null
          commission?: number
          commissioners_permission_no?: string | null
          company_size_code?: string | null
          contact?: string | null
          contract_person?: string | null
          country_region_code?: string | null
          created_at?: string
          customized_calendar?: string | null
          dalali?: number
          dammi?: number
          disable_search_by_name?: boolean
          document_sending_profile?: string | null
          e_document_service_participation?: number
          email?: string | null
          format_region?: string | null
          govt_undertaking?: boolean
          gst_registration_no?: string | null
          gst_vendor_type?: string | null
          home_page?: string | null
          hrdf?: number
          hrdf_pct?: number
          ic_partner_code?: string | null
          id?: string
          ifsc_code?: string | null
          language_code?: string | null
          last_date_modified?: string | null
          loading_stiching?: number
          location_code?: string | null
          mandi_dhara_fof_payment?: string | null
          mandi_labour?: number
          market_fees?: number
          market_pct?: number
          mobile_phone_no?: string | null
          msme?: boolean
          msme_no?: string | null
          name?: string
          our_account_no?: string | null
          pan_no?: string | null
          pan_reference_no?: string | null
          pan_status?: string | null
          payment_method_code?: string | null
          payment_terms_code?: string | null
          payment_terms_id?: string | null
          payments_lcy?: number
          per_pack_qty?: number
          phone_no?: string | null
          post_code?: string | null
          prices_including_vat?: boolean
          primary_contact_code?: string | null
          privacy_blocked?: boolean
          purchaser_code?: string | null
          receive_e_document_to?: string | null
          responsibility_center?: string | null
          search_name?: string | null
          shipment_method_code?: string | null
          state_code?: string | null
          subcontractor?: boolean
          sustainability_certificate_name?: string | null
          sustainability_certificate_no?: string | null
          transporter?: boolean
          updated_at?: string
          vat_registration_no?: string | null
          vendor_location?: string | null
          vendor_no?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_number: { Args: { _code: string }; Returns: string }
    }
    Enums: {
      inward_gate_entry_status: "Open" | "Released" | "Posted"
      mandi_purchase_status: "Open" | "Released" | "PO Created"
      purchase_order_status: "Open" | "Released" | "Posted"
      sales_invoice_status: "Open" | "Released" | "Pending Approval" | "Closed"
      sales_order_status: "Open" | "Released" | "Pending Approval" | "Closed"
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
      inward_gate_entry_status: ["Open", "Released", "Posted"],
      mandi_purchase_status: ["Open", "Released", "PO Created"],
      purchase_order_status: ["Open", "Released", "Posted"],
      sales_invoice_status: ["Open", "Released", "Pending Approval", "Closed"],
      sales_order_status: ["Open", "Released", "Pending Approval", "Closed"],
    },
  },
} as const
