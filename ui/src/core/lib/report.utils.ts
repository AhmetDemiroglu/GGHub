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
export const getReportStatusVariant = (status: ReportStatus): "destructive" | "default" | "secondary" | "outline" => {
    switch (status) {
        case ReportStatus.Open:
            return "destructive";
        case ReportStatus.Resolved:
            return "default";
        case ReportStatus.Ignored:
            return "secondary";
        default:
            return "outline";
    }
};
