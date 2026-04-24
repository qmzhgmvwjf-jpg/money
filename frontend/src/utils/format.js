export function formatCurrency(value = 0) {
  return `${Number(value || 0).toLocaleString()}원`;
}

export function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
}

export function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ko-KR");
}

export function groupByDate(items = [], key = "created_at") {
  return items.reduce((acc, item) => {
    const dateKey = item[key]
      ? new Date(item[key]).toLocaleDateString("ko-KR")
      : "날짜 없음";
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});
}

export function statusTone(status) {
  if (["completed", "success", "open", "online"].includes(status)) return "success";
  if (["cancelled", "danger", "closed", "offline"].includes(status)) return "danger";
  if (["assigned", "accepted", "delivering", "dispatch_ready"].includes(status)) return "primary";
  return "secondary";
}

export function getStoreVisual(seed = "") {
  const themes = [
    ["#6ee7f9", "#2563eb"],
    ["#f9a8d4", "#7c3aed"],
    ["#fbbf24", "#ef4444"],
    ["#34d399", "#0f766e"],
    ["#c4b5fd", "#2563eb"],
  ];
  const index = seed.length % themes.length;
  return `linear-gradient(135deg, ${themes[index][0]}, ${themes[index][1]})`;
}

export function inferCategory(name = "") {
  const lower = name.toLowerCase();
  if (lower.includes("치킨")) return "치킨";
  if (lower.includes("피자")) return "피자";
  if (lower.includes("김밥") || lower.includes("분식")) return "분식";
  if (lower.includes("버거")) return "버거";
  if (lower.includes("카페") || lower.includes("커피")) return "카페";
  return "추천";
}
