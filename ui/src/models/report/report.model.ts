export enum ReportStatus {
  Open = 0,
  Resolved = 1,
  Ignored = 2,
}
export interface ReportForCreation {
  reason: string;
}
export interface MyReportSummary {
  id: number;
  entityType: string; 
  entityId: number;
  reason: string;
  status: ReportStatus;
  createdAt: string;
}