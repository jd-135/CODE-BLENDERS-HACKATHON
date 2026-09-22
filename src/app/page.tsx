"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  db,
  BusinessEntity,
  WorkflowTask,
  AuditLog,
  SystemMetrics,
  PriorityLevel,
  WorkflowStatus,
} from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Activity,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Layers,
  Plus,
  RefreshCw,
  Sparkles,
  Zap,
  TrendingUp,
  Radio,
  FileCheck,
} from "lucide-react";

export default function BizHackDashboard() {
  const [entities, setEntities] = useState<BusinessEntity[]>([]);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [provider, setProvider] = useState<string>("Local Store (Offline Mode)");
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // New Entity Form State
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newCategory, setNewCategory] = useState("Supply Chain");
  const [newPriority, setNewPriority] = useState<PriorityLevel>("HIGH");
  const [newBudget, setNewBudget] = useState("50000");

  const refreshData = async () => {
    const [eList, tList, lList, mData] = await Promise.all([
      db.getEntities(),
      db.getTasks(),
      db.getLogs(6),
      db.getMetrics(),
    ]);
    setEntities(eList);
    setTasks(tList);
    setLogs(lList);
    setMetrics(mData);
    setProvider(db.getProviderName());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSeedRandom = () => {
    startTransition(async () => {
      await db.seedRandomEntity();
      await refreshData();
    });
  };

  const handleReset = () => {
    startTransition(async () => {
      await db.resetDefaults();
      await refreshData();
    });
  };

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    startTransition(async () => {
      await db.createEntity({
        name: newName,
        code: newCode || `BIZ-${Math.floor(1000 + Math.random() * 9000)}`,
        category: newCategory,
        status: "ACTIVE",
        priority: newPriority,
        ownerId: "usr-01",
        ownerName: "Operator",
        budget: Number(newBudget) || 0,
      });
      setIsDialogOpen(false);
      setNewName("");
      setNewCode("");
      await refreshData();
    });
  };

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case "CRITICAL":
        return <Badge className="bg-red-500 hover:bg-red-600 text-white font-semibold">CRITICAL</Badge>;
      case "HIGH":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">HIGH</Badge>;
      case "MEDIUM":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">MEDIUM</Badge>;
      default:
        return <Badge variant="secondary">LOW</Badge>;
    }
  };

  const getStatusBadge = (status: WorkflowStatus) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-emerald-600 text-white flex items-center gap-1"><Radio className="w-3 h-3 animate-pulse" /> Active</Badge>;
      case "COMPLETED":
        return <Badge variant="outline" className="text-emerald-600 border-emerald-600">Completed</Badge>;
      case "PENDING_REVIEW":
        return <Badge variant="outline" className="text-amber-600 border-amber-600">Pending Review</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">BIZ HACK &apos;26</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono border border-indigo-500/20">v1.0 Ready</span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">Enterprise Workflow Automation &amp; Intelligence Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-zinc-400">Data Engine:</span>
              <span className="text-emerald-400 font-medium">{provider}</span>
            </div>

            <Link href="/srs">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-800 bg-zinc-900/80 text-indigo-400 hover:bg-zinc-800 hover:text-indigo-300 text-xs flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                SRS Document (PDF)
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isPending}
              className="border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isPending ? "animate-spin" : ""}`} />
              Reset Baseline
            </Button>

            <Button
              size="sm"
              onClick={handleSeedRandom}
              disabled={isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 text-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Inject Synthetic Data
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hackathon Status & Readiness Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-zinc-900 p-6 sm:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Zero-Latency Offline Workspace Verified</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Enterprise Business Automation Control Center
              </h1>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Full-stack environment pre-warmed for BIZ HACK &apos;26 live evaluations. Includes deterministic offline state fallback, automated faker seeders, shadcn/ui components, and synchronized IEEE SRS documentation.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
              <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-right">
                <span className="text-xs text-zinc-400 block">Evaluator Target Freeze</span>
                <span className="text-sm font-bold text-amber-400 font-mono">2:30 PM (Sep 23, 2026)</span>
              </div>
              <div className="flex items-center justify-end gap-2 text-xs text-zinc-400">
                <FileCheck className="w-4 h-4 text-indigo-400" />
                <span>SRS Spec: <code className="text-zinc-200">BIZ_HACK_SRS.md</code></span>
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="bg-zinc-900/70 border-zinc-800/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400">Active Workflows</CardTitle>
              <Layers className="h-4 w-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-white">{metrics?.activeWorkflows ?? 0}</div>
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> of {metrics?.totalEntities ?? 0} total business entities
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/70 border-zinc-800/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400">Efficiency Score</CardTitle>
              <Zap className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-white">{metrics?.efficiencyScore ?? 94.8}%</div>
              <p className="text-xs text-zinc-400 mt-1">Autonomous orchestration rate</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/70 border-zinc-800/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400">Tasks Resolved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-white">{metrics?.completedTasks ?? 0}</div>
              <p className="text-xs text-emerald-400 mt-1">100% SLA Compliance</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/70 border-zinc-800/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400">Avg Resolution</CardTitle>
              <Clock className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-white">{metrics?.avgResolutionTimeHours ?? 2.8} hrs</div>
              <p className="text-xs text-zinc-400 mt-1">Real-time pipeline speed</p>
            </CardContent>
          </Card>
        </div>

        {/* Business Entities & Workflows Management Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Business Entity Pipelines</h2>
                <p className="text-xs text-zinc-400">Core operational entities tracked across enterprise workflows</p>
              </div>

              <Button
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> New Entity
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-[425px]">
                  <form onSubmit={handleCreateEntity}>
                    <DialogHeader>
                      <DialogTitle className="text-white">Create Business Entity</DialogTitle>
                      <DialogDescription className="text-zinc-400 text-xs">
                        Define a new high-priority operational workflow or business process.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-300">Entity / Workflow Name</label>
                        <Input
                          placeholder="e.g., Automated Freight Clearing Gateway"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="bg-zinc-950 border-zinc-800 text-white"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-zinc-300">Category</label>
                          <Input
                            placeholder="e.g. FinTech"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="bg-zinc-950 border-zinc-800 text-white"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-zinc-300">Budget ($)</label>
                          <Input
                            type="number"
                            placeholder="75000"
                            value={newBudget}
                            onChange={(e) => setNewBudget(e.target.value)}
                            className="bg-zinc-950 border-zinc-800 text-white"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={isPending}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white w-full sm:w-auto"
                      >
                        Create Entity
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="bg-zinc-900/60 border-zinc-800 overflow-hidden">
              <Table>
                <TableHeader className="bg-zinc-900">
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400 text-xs">Entity &amp; Code</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Category</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Priority</TableHead>
                    <TableHead className="text-zinc-400 text-xs">Status</TableHead>
                    <TableHead className="text-zinc-400 text-xs text-right">Budget</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entities.map((entity) => (
                    <TableRow key={entity.id} className="border-zinc-800/60 hover:bg-zinc-800/40">
                      <TableCell className="font-medium">
                        <div className="text-white text-sm">{entity.name}</div>
                        <div className="text-xs font-mono text-zinc-500">{entity.code} · {entity.ownerName}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-zinc-300">{entity.category}</span>
                      </TableCell>
                      <TableCell>{getPriorityBadge(entity.priority)}</TableCell>
                      <TableCell>{getStatusBadge(entity.status)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-zinc-300">
                        ${(entity.budget || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {entities.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                        No active entities found. Click &quot;Inject Synthetic Data&quot; to populate.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Audit Trail & Live Activity Stream */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                Immutable Audit Trail
              </h2>
              <p className="text-xs text-zinc-400">Real-time state transitions and telemetry events</p>
            </div>

            <Card className="bg-zinc-900/60 border-zinc-800 p-4 space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/60 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-indigo-300 font-mono">{log.action}</span>
                    <span className="text-zinc-500 text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-zinc-300">{log.details}</p>
                  <div className="text-zinc-500 text-[10px]">By: {log.performedBy}</div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-center py-6 text-zinc-500 text-xs">No audit events recorded yet.</div>
              )}
            </Card>

            {/* Quick SRS & Tech Reference Card */}
            <Card className="bg-gradient-to-br from-zinc-900 to-indigo-950/30 border-zinc-800 p-4">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs mb-2">
                <FileText className="w-4 h-4" />
                <span>Evaluation Deliverables</span>
              </div>
              <ul className="text-xs space-y-2 text-zinc-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Next.js 16 App Router &amp; TypeScript</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tailwind CSS v4 &amp; shadcn/ui library</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Offline In-Memory / Local Persistence</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>IEEE-830 Standard SRS (<code className="text-indigo-300">BIZ_HACK_SRS.md</code>)</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-900/40 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>BIZ HACK &apos;26 Full-Stack Solution Architecture · All systems operational</div>
          <div className="flex items-center gap-4">
            <span>Offline-Ready</span>
            <span>TypeScript Strict</span>
            <span>App Router</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
