import { BusinessEntity, WorkflowTask, AuditLog, UserProfile, SystemMetrics } from "./types";
import { initialEntities, initialTasks, initialLogs, initialProfiles, initialMetrics } from "./mock-data";
import { faker } from "@faker-js/faker";

class LocalStore {
  private entities: BusinessEntity[] = [...initialEntities];
  private tasks: WorkflowTask[] = [...initialTasks];
  private logs: AuditLog[] = [...initialLogs];
  private profiles: UserProfile[] = [...initialProfiles];

  getEntities(): BusinessEntity[] {
    return [...this.entities];
  }

  getEntityById(id: string): BusinessEntity | undefined {
    return this.entities.find((e) => e.id === id);
  }

  createEntity(data: Omit<BusinessEntity, "id" | "createdAt" | "updatedAt">): BusinessEntity {
    const newEntity: BusinessEntity = {
      ...data,
      id: `ent-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.entities.unshift(newEntity);
    this.addLog({
      action: "ENTITY_CREATED",
      entity: "BusinessEntity",
      entityId: newEntity.id,
      performedBy: newEntity.ownerName || "System Operator",
      details: `Created new entity "${newEntity.name}" [${newEntity.code}]`,
    });
    return newEntity;
  }

  updateEntity(id: string, updates: Partial<BusinessEntity>): BusinessEntity | null {
    const idx = this.entities.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    this.entities[idx] = {
      ...this.entities[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.addLog({
      action: "ENTITY_UPDATED",
      entity: "BusinessEntity",
      entityId: id,
      performedBy: "Operator",
      details: `Updated fields: ${Object.keys(updates).join(", ")}`,
    });

    return this.entities[idx];
  }

  deleteEntity(id: string): boolean {
    const idx = this.entities.findIndex((e) => e.id === id);
    if (idx === -1) return false;

    const removed = this.entities.splice(idx, 1)[0];
    this.tasks = this.tasks.filter((t) => t.entityId !== id);

    this.addLog({
      action: "ENTITY_DELETED",
      entity: "BusinessEntity",
      entityId: id,
      performedBy: "Operator",
      details: `Deleted entity "${removed.name}"`,
    });

    return true;
  }

  getTasks(entityId?: string): WorkflowTask[] {
    if (entityId) {
      return this.tasks.filter((t) => t.entityId === entityId);
    }
    return [...this.tasks];
  }

  createTask(data: Omit<WorkflowTask, "id" | "createdAt">): WorkflowTask {
    const newTask: WorkflowTask = {
      ...data,
      id: `tsk-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
    };
    this.tasks.unshift(newTask);
    this.addLog({
      action: "TASK_CREATED",
      entity: "WorkflowTask",
      entityId: newTask.id,
      performedBy: newTask.assignee || "Operator",
      details: `Created task "${newTask.title}" for entity ${newTask.entityId}`,
    });
    return newTask;
  }

  updateTask(id: string, updates: Partial<WorkflowTask>): WorkflowTask | null {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    this.tasks[idx] = {
      ...this.tasks[idx],
      ...updates,
    };

    this.addLog({
      action: "TASK_UPDATED",
      entity: "WorkflowTask",
      entityId: id,
      performedBy: this.tasks[idx].assignee,
      details: `Updated task status to ${this.tasks[idx].status}`,
    });

    return this.tasks[idx];
  }

  getLogs(limit = 20): AuditLog[] {
    return this.logs.slice(0, limit);
  }

  private addLog(log: Omit<AuditLog, "id" | "timestamp">) {
    this.logs.unshift({
      ...log,
      id: `log-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
    });
  }

  getMetrics(): SystemMetrics {
    const totalEntities = this.entities.length;
    const activeWorkflows = this.entities.filter((e) => e.status === "ACTIVE").length;
    const completedTasks = this.tasks.filter((t) => t.status === "DONE").length;
    const pendingReviews = this.entities.filter((e) => e.status === "PENDING_REVIEW").length;

    return {
      totalEntities,
      activeWorkflows,
      completedTasks: completedTasks + initialMetrics.completedTasks,
      pendingReviews,
      efficiencyScore: Math.min(99.4, 90 + activeWorkflows * 1.5),
      avgResolutionTimeHours: 2.8,
    };
  }

  seedRandomEntity(): BusinessEntity {
    const company = faker.company.name();
    const categories = ["Supply Chain", "FinTech & Billing", "Operations", "Governance & ESG", "AI Automation"];
    const statuses: BusinessEntity["status"][] = ["DRAFT", "ACTIVE", "PENDING_REVIEW", "COMPLETED"];
    const priorities: BusinessEntity["priority"][] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

    return this.createEntity({
      name: `${company} Workflow Optimizer`,
      code: `BIZ-${faker.string.alphanumeric(4).toUpperCase()}`,
      category: faker.helpers.arrayElement(categories),
      status: faker.helpers.arrayElement(statuses),
      priority: faker.helpers.arrayElement(priorities),
      ownerId: "usr-01",
      ownerName: faker.person.fullName(),
      budget: faker.number.int({ min: 25000, max: 250000 }),
      metadata: { generatedVia: "FakerEngine", automated: true },
    });
  }

  resetToDefaults() {
    this.entities = [...initialEntities];
    this.tasks = [...initialTasks];
    this.logs = [...initialLogs];
    this.profiles = [...initialProfiles];
  }
}

// Global singleton pattern across Next.js live reloads
declare global {
  var __bizhack_local_store__: LocalStore | undefined;
}

export const localStore = globalThis.__bizhack_local_store__ ?? new LocalStore();
if (process.env.NODE_ENV !== "production") {
  globalThis.__bizhack_local_store__ = localStore;
}
