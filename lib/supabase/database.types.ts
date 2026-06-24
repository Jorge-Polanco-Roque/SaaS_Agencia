// Tipos del esquema. Mantener sincronizado con supabase/migrations/.
// En entorno con Supabase local: regenerar con `npm run gen:types`.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole =
  | "super_admin"
  | "ejecutivo"
  | "admin"
  | "operaciones"
  | "compras_finanzas"
  | "contabilidad"
  | "cliente";

export type ProductoTipo = "promocional" | "evento" | "servicio";

export type CotizacionEstado =
  | "borrador"
  | "en_validacion"
  | "validada"
  | "rechazada"
  | "enviada_cliente"
  | "conforme_pendiente"
  | "confirmada"
  | "en_negociacion"
  | "cancelada";

export type ProyectoEstado = "activo" | "en_pausa" | "cerrado" | "cancelado";

export type TareaColumna = "por_hacer" | "en_proceso" | "bloqueado" | "hecho";

export type OcEstado =
  | "borrador"
  | "por_autorizar"
  | "autorizada"
  | "rechazada"
  | "cerrada"
  | "cancelada";

export type SolicitudTipo =
  | "anticipo"
  | "liquidacion"
  | "pago_unico"
  | "reembolso";

export type SolicitudEstado =
  | "pendiente"
  | "autorizada"
  | "rechazada"
  | "pagada";

export type PagoTipo = "anticipo" | "dispersion" | "liquidacion" | "abono";

export type FacturaTipo = "emitida_cliente" | "recibida_proveedor";

export type FacturaEstado = "registrada" | "pagada" | "cancelada";

export type NotifCanal = "email" | "whatsapp";

export type NotifEstado = "enviado" | "fallido" | "simulado";

type Timestamps = { created_at: string };

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: { id: string; nombre: string } & Timestamps;
        Insert: { id?: string; nombre: string; created_at?: string };
        Update: { id?: string; nombre?: string; created_at?: string };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          org_id: string;
          nombre: string;
          rol: AppRole;
        } & Timestamps;
        Insert: {
          id: string;
          org_id: string;
          nombre: string;
          rol?: AppRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          nombre?: string;
          rol?: AppRole;
          created_at?: string;
        };
        Relationships: [];
      };
      clientes: {
        Row: {
          id: string;
          org_id: string;
          nombre: string;
          rfc: string | null;
          email: string | null;
          telefono: string | null;
          notas: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          nombre: string;
          rfc?: string | null;
          email?: string | null;
          telefono?: string | null;
          notas?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clientes"]["Insert"]>;
        Relationships: [];
      };
      contactos: {
        Row: {
          id: string;
          org_id: string;
          cliente_id: string;
          nombre: string;
          cargo: string | null;
          email: string | null;
          telefono: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          cliente_id: string;
          nombre: string;
          cargo?: string | null;
          email?: string | null;
          telefono?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contactos"]["Insert"]>;
        Relationships: [];
      };
      proveedores: {
        Row: {
          id: string;
          org_id: string;
          nombre: string;
          categoria: string | null;
          contacto: string | null;
          email: string | null;
          telefono: string | null;
          dias_entrega: number | null;
          notas: string | null;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          nombre: string;
          categoria?: string | null;
          contacto?: string | null;
          email?: string | null;
          telefono?: string | null;
          dias_entrega?: number | null;
          notas?: string | null;
          activo?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["proveedores"]["Insert"]>;
        Relationships: [];
      };
      productos_servicios: {
        Row: {
          id: string;
          org_id: string;
          tipo: ProductoTipo;
          nombre: string;
          descripcion: string | null;
          unidad: string;
          costo: number;
          precio_publico: number;
          proveedor_id: string | null;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          tipo?: ProductoTipo;
          nombre: string;
          descripcion?: string | null;
          unidad?: string;
          costo?: number;
          precio_publico?: number;
          proveedor_id?: string | null;
          activo?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["productos_servicios"]["Insert"]
        >;
        Relationships: [];
      };
      consecutivos: {
        Row: {
          org_id: string;
          serie: string;
          anio: number;
          ultimo: number;
        };
        Insert: {
          org_id: string;
          serie: string;
          anio: number;
          ultimo?: number;
        };
        Update: Partial<Database["public"]["Tables"]["consecutivos"]["Insert"]>;
        Relationships: [];
      };
      cotizaciones: {
        Row: {
          id: string;
          org_id: string;
          cliente_id: string;
          owner_id: string;
          estado: CotizacionEstado;
          serie: string;
          folio_anio: number | null;
          folio_num: number | null;
          folio: string | null;
          version: number;
          titulo: string;
          moneda: string;
          iva_tasa: number;
          descuento: number;
          subtotal: number;
          iva: number;
          total: number;
          costo_total: number;
          margen: number;
          notas: string | null;
          validada_por: string | null;
          validada_at: string | null;
          enviada_at: string | null;
          portal_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          cliente_id: string;
          owner_id: string;
          estado?: CotizacionEstado;
          serie?: string;
          folio_anio?: number | null;
          folio_num?: number | null;
          folio?: string | null;
          version?: number;
          titulo: string;
          moneda?: string;
          iva_tasa?: number;
          descuento?: number;
          subtotal?: number;
          iva?: number;
          total?: number;
          costo_total?: number;
          margen?: number;
          notas?: string | null;
          validada_por?: string | null;
          validada_at?: string | null;
          enviada_at?: string | null;
          portal_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cotizaciones"]["Insert"]>;
        Relationships: [];
      };
      cotizacion_items: {
        Row: {
          id: string;
          org_id: string;
          cotizacion_id: string;
          producto_id: string | null;
          descripcion: string;
          cantidad: number;
          unidad: string;
          costo_unitario: number;
          precio_unitario: number;
          importe: number;
          orden: number;
          modalidad: string;
          rol: string | null;
          dias: number;
        };
        Insert: {
          id?: string;
          org_id: string;
          cotizacion_id: string;
          producto_id?: string | null;
          descripcion: string;
          cantidad?: number;
          unidad?: string;
          costo_unitario?: number;
          precio_unitario?: number;
          importe?: number;
          orden?: number;
          modalidad?: string;
          rol?: string | null;
          dias?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["cotizacion_items"]["Insert"]
        >;
        Relationships: [];
      };
      cotizacion_versiones: {
        Row: {
          id: string;
          org_id: string;
          cotizacion_id: string;
          version: number;
          snapshot: Json;
          motivo: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          cotizacion_id: string;
          version: number;
          snapshot: Json;
          motivo?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["cotizacion_versiones"]["Insert"]
        >;
        Relationships: [];
      };
      proyectos: {
        Row: {
          id: string;
          org_id: string;
          cotizacion_id: string | null;
          cliente_id: string;
          nombre: string;
          estado: ProyectoEstado;
          responsable_id: string | null;
          fecha_inicio: string | null;
          fecha_entrega: string | null;
          covac_id: string | null;
          hijo_rib: string | null;
          validacion_num: string | null;
          pdf_num: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          cotizacion_id?: string | null;
          cliente_id: string;
          nombre: string;
          estado?: ProyectoEstado;
          responsable_id?: string | null;
          fecha_inicio?: string | null;
          fecha_entrega?: string | null;
          covac_id?: string | null;
          hijo_rib?: string | null;
          validacion_num?: string | null;
          pdf_num?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["proyectos"]["Insert"]>;
        Relationships: [];
      };
      tareas: {
        Row: {
          id: string;
          org_id: string;
          proyecto_id: string;
          titulo: string;
          descripcion: string | null;
          columna: TareaColumna;
          orden: number;
          responsable_id: string | null;
          fecha_limite: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          proyecto_id: string;
          titulo: string;
          descripcion?: string | null;
          columna?: TareaColumna;
          orden?: number;
          responsable_id?: string | null;
          fecha_limite?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tareas"]["Insert"]>;
        Relationships: [];
      };
      ordenes_compra: {
        Row: {
          id: string;
          org_id: string;
          proyecto_id: string | null;
          proveedor_id: string;
          serie: string;
          folio_anio: number | null;
          folio_num: number | null;
          folio: string | null;
          estado: OcEstado;
          moneda: string;
          iva_tasa: number;
          subtotal: number;
          iva: number;
          total: number;
          notas: string | null;
          created_by: string | null;
          autorizada_por: string | null;
          autorizada_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          proyecto_id?: string | null;
          proveedor_id: string;
          serie?: string;
          folio_anio?: number | null;
          folio_num?: number | null;
          folio?: string | null;
          estado?: OcEstado;
          moneda?: string;
          iva_tasa?: number;
          subtotal?: number;
          iva?: number;
          total?: number;
          notas?: string | null;
          created_by?: string | null;
          autorizada_por?: string | null;
          autorizada_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ordenes_compra"]["Insert"]>;
        Relationships: [];
      };
      orden_compra_items: {
        Row: {
          id: string;
          org_id: string;
          orden_compra_id: string;
          producto_id: string | null;
          descripcion: string;
          cantidad: number;
          unidad: string;
          costo_unitario: number;
          importe: number;
          orden: number;
        };
        Insert: {
          id?: string;
          org_id: string;
          orden_compra_id: string;
          producto_id?: string | null;
          descripcion: string;
          cantidad?: number;
          unidad?: string;
          costo_unitario?: number;
          importe?: number;
          orden?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["orden_compra_items"]["Insert"]
        >;
        Relationships: [];
      };
      solicitudes_pago: {
        Row: {
          id: string;
          org_id: string;
          proyecto_id: string | null;
          orden_compra_id: string | null;
          proveedor_id: string | null;
          concepto: string;
          tipo: SolicitudTipo;
          monto: number;
          moneda: string;
          estado: SolicitudEstado;
          fecha_requerida: string | null;
          solicitado_por: string | null;
          autorizado_por: string | null;
          autorizado_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          proyecto_id?: string | null;
          orden_compra_id?: string | null;
          proveedor_id?: string | null;
          concepto: string;
          tipo?: SolicitudTipo;
          monto: number;
          moneda?: string;
          estado?: SolicitudEstado;
          fecha_requerida?: string | null;
          solicitado_por?: string | null;
          autorizado_por?: string | null;
          autorizado_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["solicitudes_pago"]["Insert"]
        >;
        Relationships: [];
      };
      pagos: {
        Row: {
          id: string;
          org_id: string;
          solicitud_pago_id: string | null;
          orden_compra_id: string | null;
          proyecto_id: string | null;
          proveedor_id: string | null;
          tipo: PagoTipo;
          concepto: string | null;
          monto: number;
          moneda: string;
          metodo: string | null;
          referencia: string | null;
          comprobante_url: string | null;
          fecha: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          solicitud_pago_id?: string | null;
          orden_compra_id?: string | null;
          proyecto_id?: string | null;
          proveedor_id?: string | null;
          tipo?: PagoTipo;
          concepto?: string | null;
          monto: number;
          moneda?: string;
          metodo?: string | null;
          referencia?: string | null;
          comprobante_url?: string | null;
          fecha?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pagos"]["Insert"]>;
        Relationships: [];
      };
      facturas: {
        Row: {
          id: string;
          org_id: string;
          tipo: FacturaTipo;
          proyecto_id: string | null;
          orden_compra_id: string | null;
          cliente_id: string | null;
          proveedor_id: string | null;
          folio: string;
          uuid_sat: string | null;
          xml_url: string | null;
          pdf_url: string | null;
          monto: number;
          moneda: string;
          estado: FacturaEstado;
          fecha_emision: string;
          fecha_vencimiento: string | null;
          cobrada_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          tipo: FacturaTipo;
          proyecto_id?: string | null;
          orden_compra_id?: string | null;
          cliente_id?: string | null;
          proveedor_id?: string | null;
          folio: string;
          uuid_sat?: string | null;
          xml_url?: string | null;
          pdf_url?: string | null;
          monto?: number;
          moneda?: string;
          estado?: FacturaEstado;
          fecha_emision?: string;
          fecha_vencimiento?: string | null;
          cobrada_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["facturas"]["Insert"]>;
        Relationships: [];
      };
      notificaciones: {
        Row: {
          id: string;
          org_id: string;
          canal: NotifCanal;
          destinatario: string;
          asunto: string | null;
          cuerpo: string;
          entidad: string | null;
          entidad_id: string | null;
          estado: NotifEstado;
          proveedor_msg_id: string | null;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          canal: NotifCanal;
          destinatario: string;
          asunto?: string | null;
          cuerpo: string;
          entidad?: string | null;
          entidad_id?: string | null;
          estado?: NotifEstado;
          proveedor_msg_id?: string | null;
          error?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notificaciones"]["Insert"]>;
        Relationships: [];
      };
      conversaciones: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          seccion: string;
          titulo: string | null;
          thread_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          seccion?: string;
          titulo?: string | null;
          thread_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["conversaciones"]["Insert"]>;
        Relationships: [];
      };
      bitacora: {
        Row: {
          id: string;
          org_id: string;
          entidad: string;
          entidad_id: string;
          accion: string;
          estado_anterior: string | null;
          estado_nuevo: string | null;
          actor_id: string | null;
          meta: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          entidad: string;
          entidad_id: string;
          accion: string;
          estado_anterior?: string | null;
          estado_nuevo?: string | null;
          actor_id?: string | null;
          meta?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bitacora"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      next_consecutivo: {
        Args: { p_org: string; p_serie: string; p_anio: number };
        Returns: number;
      };
      auth_org_id: { Args: Record<string, never>; Returns: string };
      auth_role: { Args: Record<string, never>; Returns: AppRole };
      is_member_of: { Args: { p_org: string }; Returns: boolean };
    };
    Enums: {
      app_role: AppRole;
      producto_tipo: ProductoTipo;
      cotizacion_estado: CotizacionEstado;
      proyecto_estado: ProyectoEstado;
      tarea_columna: TareaColumna;
      oc_estado: OcEstado;
      solicitud_tipo: SolicitudTipo;
      solicitud_estado: SolicitudEstado;
      pago_tipo: PagoTipo;
      factura_tipo: FacturaTipo;
      factura_estado: FacturaEstado;
      notif_canal: NotifCanal;
      notif_estado: NotifEstado;
    };
    CompositeTypes: { [_ in never]: never };
  };
}

// Atajos de tipos de fila para uso en la app
type Tables = Database["public"]["Tables"];
export type Cliente = Tables["clientes"]["Row"];
export type Contacto = Tables["contactos"]["Row"];
export type Proveedor = Tables["proveedores"]["Row"];
export type ProductoServicio = Tables["productos_servicios"]["Row"];
export type Cotizacion = Tables["cotizaciones"]["Row"];
export type CotizacionItem = Tables["cotizacion_items"]["Row"];
export type CotizacionVersion = Tables["cotizacion_versiones"]["Row"];
export type Bitacora = Tables["bitacora"]["Row"];
export type Proyecto = Tables["proyectos"]["Row"];
export type Tarea = Tables["tareas"]["Row"];
export type OrdenCompra = Tables["ordenes_compra"]["Row"];
export type OrdenCompraItem = Tables["orden_compra_items"]["Row"];
export type SolicitudPago = Tables["solicitudes_pago"]["Row"];
export type Pago = Tables["pagos"]["Row"];
export type Factura = Tables["facturas"]["Row"];
export type Notificacion = Tables["notificaciones"]["Row"];
export type Conversacion = Tables["conversaciones"]["Row"];
