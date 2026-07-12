import { showToast } from "@/components/ui/toast";

const BASE_URL = "http://localhost:3001/api";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...customOptions } = options;

  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  // Get token from localstorage
  let token = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("sims_token");
  }

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    ...customOptions,
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sims_session");
      localStorage.removeItem("sims_token");
      window.location.href = "/login";
    }
    throw new Error("غير مصرح بالدخول - يرجى تسجيل الدخول مجدداً");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.message || "حدث خطأ غير متوقع أثناء معالجة الطلب.";
    showToast(errorMsg, "error");
    throw new Error(errorMsg);
  }

  return response.json();
}
