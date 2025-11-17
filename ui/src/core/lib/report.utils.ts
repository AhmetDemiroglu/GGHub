import { ReportStatus } from "@/models/report/report.model";

export const translateReportStatus = (status: ReportStatus): string => {
    switch (status) {
        case ReportStatus.Open:
            return "Açık";
        case ReportStatus.Resolved:
            return "Çözüldü";
        case ReportStatus.Ignored:
            return "Reddedildi";
        default:
            return ReportStatus[status] || "Bilinmiyor";
    }
};
export const getReportStatusVariant = (status: ReportStatus): "info" | "success" | "danger" => {
    switch (status) {
        case ReportStatus.Open:
            return "info";
        case ReportStatus.Resolved:
            return "success";
        case ReportStatus.Ignored:
            return "danger";
        default:
            return "info";
    }
};
