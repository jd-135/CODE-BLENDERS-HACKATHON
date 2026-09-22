import { localStore } from "./local-store";
import { supabase, isSupabaseConfigured } from "../supabase/client";
import { BusinessEntity, WorkflowTask, AuditLog, SystemMetrics } from "./types";

export interface DBRepository {
  getProviderName(): "Local Store (Offline Mode)" | "Supabase Cloud";
  isOffline(): boolean;
  getEntities(): Promise<BusinessEntity[]>;
  getEntityById(id: string): Promise<BusinessEntity | null>;
  createEntity(data: Omit<BusinessEntity, "id" | "createdAt" | "updatedAt">): Promise<BusinessEntity>;
  updateEntity(id: string, updates: Partial<BusinessEntity>): Promise<BusinessEntity | null>;
  deleteEntity(id: string): Promise<boolean>;
  getTasks(entityId?: string): Promise<WorkflowTask[]>;
  createTask(data: Omit<WorkflowTask, "id" | "createdAt">): Promise<WorkflowTask>;
  updateTask(id: string, updates: Partial<WorkflowTask>): Promise<WorkflowTask | null>;
  getLogs(limit?: number): Promise<AuditLog[]>;
  getMetrics(): Promise<SystemMetrics>;
  seedRandomEntity(): Promise<BusinessEntity>;
  resetDefaults(): Promise<void>;
}

class HybridRepository implements DBRepository {
  private useSupabase: boolean;

  constructor() {
    this.useSupabase =
      process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase" && isSupabaseConfigured();
  }

  getProviderName(): "Local Store (Offline Mode)" | "Supabase Cloud" {
    return this.useSupabase ? "Supabase Cloud" : "Local Store (Offline Mode)";
  }

  isOffline(): boolean {
    return !this.useSupabase;
  }

  async getEntities(): Promise<BusinessEntity[]> {
    if (this.useSupabase && supabase) {
      try {
        const { data, error } = await supabase
          .from("business_entities")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data) return data as unknown as BusinessEntity[];
      } catch {
        console.warn("[HybridRepository] Supabase query failed, falling back to Local Store.");
      }
    }
    return localStore.getEntities();
  }

  async getEntityById(id: string): Promise<BusinessEntity | null> {
    if (this.useSupabase && supabase) {
      try {
        const { data, error } = await supabase
          .from("business_entities")
          .select("*")
          .eq("id", id)
          .single();
        if (!error && data) return data as unknown as BusinessEntity;
      } catch {
        console.warn("[HybridRepository] Supabase fetch failed, falling back to Local Store.");
      }
    }
    return localStore.getEntityById(id) || null;
  }

  async createEntity(
    data: Omit<BusinessEntity, "id" | "createdAt" | "updatedAt">
  ): Promise<BusinessEntity> {
    if (this.useSupabase && supabase) {
      try {
        const { data: created, error } = await supabase
          .from("business_entities")
          .insert([data])
          .select()
          .single();
        if (!error && created) return created as unknown as BusinessEntity;
      } catch {
        console.warn("[HybridRepository] Supabase insert failed, falling back to Local Store.");
      }
    }
    return localStore.createEntity(data);
  }

  async updateEntity(id: string, updates: Partial<BusinessEntity>): Promise<BusinessEntity | null> {
    if (this.useSupabase && supabase) {
      try {
        const { data, error } = await supabase
          .from("business_entities")
          .update(updates)
          .eq("id", id)
          .select()
          .single();
        if (!error && data) return data as unknown as BusinessEntity;
      } catch {
        console.warn("[HybridRepository] Supabase update failed, falling back to Local Store.");
      }
    }
    return localStore.updateEntity(id, updates);
  }

  async deleteEntity(id: string): Promise<boolean> {
    if (this.useSupabase && supabase) {
      try {
        const { error } = await supabase.from("business_entities").delete().eq("id", id);
        if (!error) return true;
      } catch {
        console.warn("[HybridRepository] Supabase delete failed, falling back to Local Store.");
      }
    }
    return localStore.deleteEntity(id);
  }

  async getTasks(entityId?: string): Promise<WorkflowTask[]> {
    if (this.useSupabase && supabase) {
      try {
        let query = supabase.from("workflow_tasks").select("*");
        if (entityId) query = query.eq("entity_id", entityId);
        const { data, error } = await query;
        if (!error && data) return data as unknown as WorkflowTask[];
      } catch {
        console.warn("[HybridRepository] Supabase tasks query failed, falling back to Local Store.");
      }
    }
    return localStore.getTasks(entityId);
  }

  async createTask(data: Omit<WorkflowTask, "id" | "createdAt">): Promise<WorkflowTask> {
    if (this.useSupabase && supabase) {
      try {
        const { data: created, error } = await supabase
          .from("workflow_tasks")
          .insert([data])
          .select()
          .single();
        if (!error && created) return created as unknown as WorkflowTask;
      } catch {
        console.warn("[HybridRepository] Supabase create task failed, falling back to Local Store.");
      }
    }
    return localStore.createTask(data);
  }

  async updateTask(id: string, updates: Partial<WorkflowTask>): Promise<WorkflowTask | null> {
    if (this.useSupabase && supabase) {
      try {
        const { data, error } = await supabase
          .from("workflow_tasks")
          .update(updates)
          .eq("id", id)
          .select()
          .single();
        if (!error && data) return data as unknown as WorkflowTask;
      } catch {
        console.warn("[HybridRepository] Supabase update task failed, falling back to Local Store.");
      }
    }
    return localStore.updateTask(id, updates);
  }

  async getLogs(limit?: number): Promise<AuditLog[]> {
    return localStore.getLogs(limit);
  }

  async getMetrics(): Promise<SystemMetrics> {
    return localStore.getMetrics();
  }

  async seedRandomEntity(): Promise<BusinessEntity> {
    return localStore.seedRandomEntity();
  }

  async resetDefaults(): Promise<void> {
    localStore.resetToDefaults();
  }
}

export const db: DBRepository = new HybridRepository();
