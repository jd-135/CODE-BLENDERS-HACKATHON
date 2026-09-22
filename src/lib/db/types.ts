export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type WorkflowStatus = "DRAFT" | "ACTIVE" | "PENDING_REVIEW" | "COMPLETED" | "ARCHIVED";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "BLOCKED";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "MANAGER" | "ANALYST" | "OPERATOR";
  avatarUrl?: string;
  department: string;
  createdAt: string;
}

export interface BusinessEntity {
  id: string;
  name: string;
  code: string;
  category: string;
  status: WorkflowStatus;
  priority: PriorityLevel;
  ownerId: string;
  ownerName: string;
  budget?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTask {
  id: string;
  entityId: string;
  title: string;
  description: string;
  assignee: string;
  status: TaskStatus;
  priority: PriorityLevel;
  dueDate: string;
  completionRate: number;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  performedBy: string;
  details: string;
  timestamp: string;
}

export interface SystemMetrics {
  totalEntities: number;
  activeWorkflows: number;
  completedTasks: number;
  pendingReviews: number;
  efficiencyScore: number;
  avgResolutionTimeHours: number;
}
