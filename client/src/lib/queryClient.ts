import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Debug log the request details
  console.log(`Making ${method} request to ${url}`, data);
  
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // For PATCH requests, let's log more details about the response
  if (method === "PATCH") {
    const responseClone = res.clone();
    try {
      const responseBody = await responseClone.json();
      console.log(`PATCH response from ${url}:`, responseBody);
    } catch (e) {
      console.log(`Could not parse PATCH response from ${url}:`, e);
    }
  }

  await throwIfResNotOk(res);
  return res;
}

export async function uploadFile(
  url: string,
  formData: FormData,
): Promise<Response> {
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: "include",
    // Don't set Content-Type header - the browser will set it automatically with the boundary
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
