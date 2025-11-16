export const getImageUrl = (path: string | null | undefined): string | undefined => {
    if (!path) {
        return undefined;
    }

    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!API_BASE) {
        return path;
    }
    if (API_BASE.endsWith("/") && path.startsWith("/")) {
        return `${API_BASE}${path.substring(1)}`;
    }

    return `${API_BASE}${path}`;
};
