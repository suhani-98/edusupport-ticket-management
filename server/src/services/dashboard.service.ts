import { Types, type FilterQuery, type PipelineStage } from "mongoose";
import { Escalation } from "../models/Escalation.js";
import { Ticket } from "../models/Ticket.js";
import { toTicketSummary, type TicketSource } from "../utils/ticketResponse.js";

type CountRow = { _id: string; count: number };

function objectId(value: string) {
  return new Types.ObjectId(value);
}

function countOf(rows: CountRow[], key: string) {
  return rows.find((row) => row._id === key)?.count ?? 0;
}

async function groupedCounts(match: FilterQuery<unknown>) {
  const now = new Date();
  const [result] = await Ticket.aggregate<{
    status: CountRow[];
    priority: CountRow[];
    sla: CountRow[];
    overdue: Array<{ count: number }>;
  }>([
    { $match: match },
    {
      $facet: {
        status: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        priority: [{ $group: { _id: "$priority", count: { $sum: 1 } } }],
        sla: [{ $group: { _id: "$slaStatus", count: { $sum: 1 } } }],
        overdue: [
          { $match: { status: { $ne: "CLOSED" }, slaDeadline: { $lte: now } } },
          { $count: "count" },
        ],
      },
    },
  ]);
  const status = result?.status ?? [];
  const priority = result?.priority ?? [];
  const sla = result?.sla ?? [];
  return {
    status,
    priorityCounts: {
      low: countOf(priority, "LOW"),
      medium: countOf(priority, "MEDIUM"),
      high: countOf(priority, "HIGH"),
      critical: countOf(priority, "CRITICAL"),
    },
    slaCounts: {
      withinSla: countOf(sla, "WITHIN_SLA"),
      approachingSla: countOf(sla, "APPROACHING_SLA"),
      breached: countOf(sla, "BREACHED"),
      overdueOpen: result?.overdue[0]?.count ?? 0,
    },
    total: status.reduce((sum, row) => sum + row.count, 0),
  };
}

async function recentTickets(match: FilterQuery<unknown>, limit: number) {
  const tickets = await Ticket.find(match)
    .sort({ updatedAt: -1, _id: -1 })
    .limit(limit)
    .populate([
      { path: "categoryId", select: "name" },
      { path: "assignedTo", select: "name email" },
    ])
    .lean<TicketSource[]>();
  return tickets.map((ticket) => toTicketSummary(ticket));
}

async function escalationCounts(staffId?: string) {
  const pipeline: PipelineStage[] = [
    { $match: { status: "OPEN" } },
    {
      $lookup: {
        from: "tickets",
        localField: "ticketId",
        foreignField: "_id",
        as: "ticket",
      },
    },
    { $unwind: "$ticket" },
  ];
  if (staffId) {
    pipeline.push({ $match: { "ticket.assignedTo": objectId(staffId) } });
  }
  pipeline.push({ $group: { _id: "$level", count: { $sum: 1 } } });
  const rows = await Escalation.aggregate<CountRow>(pipeline);
  const level1 = countOf(rows, "LEVEL_1");
  const level2 = countOf(rows, "LEVEL_2");
  return { open: level1 + level2, level1, level2 };
}

export async function studentDashboard(userId: string) {
  const match = { studentId: objectId(userId) };
  const counts = await groupedCounts(match);
  return {
    ticketCounts: {
      total: counts.total,
      open: countOf(counts.status, "OPEN"),
      inProgress: countOf(counts.status, "IN_PROGRESS"),
      pending: countOf(counts.status, "PENDING"),
      resolved: countOf(counts.status, "RESOLVED"),
      closed: countOf(counts.status, "CLOSED"),
    },
    priorityCounts: counts.priorityCounts,
    slaCounts: {
      withinSla: counts.slaCounts.withinSla,
      approachingSla: counts.slaCounts.approachingSla,
      breached: counts.slaCounts.breached,
    },
    recentTickets: await recentTickets(match, 5),
  };
}

export async function staffDashboard(userId: string) {
  const match = { assignedTo: objectId(userId) };
  const counts = await groupedCounts(match);
  return {
    ticketCounts: {
      assigned: countOf(counts.status, "ASSIGNED"),
      inProgress: countOf(counts.status, "IN_PROGRESS"),
      pending: countOf(counts.status, "PENDING"),
      resolved: countOf(counts.status, "RESOLVED"),
      closed: countOf(counts.status, "CLOSED"),
    },
    priorityCounts: counts.priorityCounts,
    slaCounts: counts.slaCounts,
    escalationCounts: await escalationCounts(userId),
    recentTickets: await recentTickets(match, 5),
  };
}

export async function managerDashboard() {
  const counts = await groupedCounts({});
  const [categoryCounts, staffWorkload, recent] = await Promise.all([
    Ticket.aggregate<{ categoryId: Types.ObjectId; categoryName?: string; count: number }>([
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          categoryId: "$_id",
          categoryName: "$category.name",
          count: 1,
        },
      },
      { $sort: { count: -1, categoryName: 1 } },
    ]),
    Ticket.aggregate<{
      staffId: Types.ObjectId;
      name: string;
      assigned: number;
      inProgress: number;
      pending: number;
      breached: number;
    }>([
      { $match: { assignedTo: { $ne: null } } },
      {
        $group: {
          _id: "$assignedTo",
          assigned: { $sum: 1 },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "IN_PROGRESS"] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
          breached: { $sum: { $cond: [{ $eq: ["$slaStatus", "BREACHED"] }, 1, 0] } },
        },
      },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "staff" } },
      { $unwind: "$staff" },
      { $match: { "staff.role": "staff", "staff.isActive": true } },
      {
        $project: {
          _id: 0,
          staffId: "$_id",
          name: "$staff.name",
          assigned: 1,
          inProgress: 1,
          pending: 1,
          breached: 1,
        },
      },
      { $sort: { assigned: -1, name: 1 } },
    ]),
    recentTickets({}, 10),
  ]);
  return {
    ticketCounts: {
      total: counts.total,
      open: countOf(counts.status, "OPEN"),
      assigned: countOf(counts.status, "ASSIGNED"),
      inProgress: countOf(counts.status, "IN_PROGRESS"),
      pending: countOf(counts.status, "PENDING"),
      resolved: countOf(counts.status, "RESOLVED"),
      closed: countOf(counts.status, "CLOSED"),
    },
    priorityCounts: counts.priorityCounts,
    slaCounts: counts.slaCounts,
    escalationCounts: await escalationCounts(),
    categoryCounts: categoryCounts.map((row) => ({
      categoryId: row.categoryId.toString(),
      categoryName: row.categoryName ?? "Unknown",
      count: row.count,
    })),
    staffWorkload: staffWorkload.map((row) => ({
      staffId: row.staffId.toString(),
      name: row.name,
      assigned: row.assigned,
      inProgress: row.inProgress,
      pending: row.pending,
      breached: row.breached,
    })),
    recentTickets: recent,
  };
}
