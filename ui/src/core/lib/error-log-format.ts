import type { ErrorEvent, ErrorGroup } from "@/models/admin/error-log.model";

/** "Npgsql.PostgresException" -> "PostgresException". */
export function shortTypeName(fullName: string): string {
    // Exception'siz log kaydi: tip yerine log sablonu gelir, noktadan bolunmez.
    if (fullName.startsWith("LogError:")) return fullName;
    const index = fullName.lastIndexOf(".");
    return index >= 0 && index < fullName.length - 1 ? fullName.slice(index + 1) : fullName;
}

/** Tablodaki ve kopyadaki "uc" satiri: API hatasinda metot + rota, digerlerinde logu yazan sinif. */
export function errorEndpoint(group: Pick<ErrorGroup, "method" | "routeTemplate" | "logger" | "source">): string {
    if (group.routeTemplate) {
        return `${group.method ?? ""} /${group.routeTemplate.replace(/^\//, "")}`.trim();
    }
    return group.logger ? shortTypeName(group.logger) : group.source.toUpperCase();
}

/**
 * Panodaki duz metin. Bir sohbete ya da issue'ya yapistirildiginda tek basina anlasilsin diye
 * etiketler sabit ve Ingilizce (log satirlari gibi); arayuz dili bunu degistirmez.
 */
export function formatErrorForClipboard(group: ErrorGroup, event: ErrorEvent | undefined): string {
    const lines: string[] = [
        `GGHub error #${group.id}`,
        `Endpoint: ${errorEndpoint(group)}`,
        `Status: ${group.statusCode ?? "-"} | Source: ${group.source} | State: ${group.status} | Count: ${group.count}`,
        `First seen: ${group.firstSeenAt}`,
        `Last seen: ${group.lastSeenAt}`,
        `Exception: ${group.exceptionType}`,
        `Message: ${group.message}`,
    ];
    if (group.logger) lines.push(`Logger: ${group.logger}`);
    if (group.note) lines.push(`Note: ${group.note}`);

    if (event) {
        lines.push("", "Latest event");
        lines.push(`Time: ${event.occurredAt}`);
        if (event.path) lines.push(`Request: ${event.method ?? ""} ${event.path}${event.queryString ?? ""}`.trim());
        if (event.userId || event.username) lines.push(`User: ${event.username ?? "-"} (#${event.userId ?? "-"})`);
        if (event.traceId) lines.push(`TraceId: ${event.traceId}`);
        if (event.environment) lines.push(`Environment: ${event.environment}`);
        if (event.locale) lines.push(`Locale: ${event.locale}`);
        if (event.userAgent) lines.push(`User-Agent: ${event.userAgent}`);
        if (event.message && event.message !== group.message) lines.push(`Event message: ${event.message}`);
        if (event.innerChain) lines.push("", "Inner exceptions:", event.innerChain);
        if (event.stackTrace) lines.push("", "Stack trace:", event.stackTrace);
    }

    return lines.join("\n");
}
