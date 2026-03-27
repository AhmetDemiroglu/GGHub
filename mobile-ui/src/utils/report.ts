import { ReportStatus } from '../models/report';

export const translateReportStatus = (status: ReportStatus): string => {
  switch (status) {
    case ReportStatus.Open:
      return 'A\u00E7\u0131k';
    case ReportStatus.Resolved:
      return '\u00C7\u00F6z\u00FCld\u00FC';
    case ReportStatus.Ignored:
      return 'Reddedildi';
    default:
      return ReportStatus[status] || 'Bilinmiyor';
  }
};

export const getReportStatusVariant = (
  status: ReportStatus,
): 'info' | 'success' | 'danger' => {
  switch (status) {
    case ReportStatus.Open:
      return 'info';
    case ReportStatus.Resolved:
      return 'success';
    case ReportStatus.Ignored:
      return 'danger';
    default:
      return 'info';
  }
};

export const translateEntityType = (
  type: string | undefined | null,
): string => {
  if (!type) return 'T\u00FCm\u00FC';
  switch (type) {
    case 'Comment':
      return 'Yorum';
    case 'Review':
      return '\u0130nceleme';
    case 'List':
      return 'Liste';
    case 'User':
      return 'Kullan\u0131c\u0131';
    default:
      return type;
  }
};
