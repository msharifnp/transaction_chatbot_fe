// export const JWT_TOKEN =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJpdnAtdXNlci0wMDIiLCJUZW5hbnRJZCI6ImQ4YTRjODE2LWQ4YTItOWZjYy02NThhLTNhMWUzODA1MGEzZCIsInJvbGUiOiJ1c2VyIiwiZXhwIjo0NzAwMDAwMDAwfQ.HJhCZ8v0qslHfqnyQy712ItFiHXDOQgmTcKqcGGUKyY";

// export function getAuthHeaders(
//   headers: Record<string, string> = {}
// ): Record<string, string> {
//   return {
//     Authorization: `Bearer ${JWT_TOKEN}`,
//     ...headers,
//   };
// }

export const JWT_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVc2VySWQiOiJpdnAtdXNlci0wMDIiLCJUZW5hbnRJZCI6ImE1ZmJjYjY5LWVkYTgtMjBiZC00YzI5LTNhMWE4OTY5ZDllNCIsInJvbGUiOiJ1c2VyIiwiZXhwIjo0NzAwMDAwMDAwfQ.VdTJzYPkM_dNc_GD5uAZBY2JxBZKJFNu7qjyhVUGsss";

export function getAuthHeaders(
  headers: Record<string, string> = {}
): Record<string, string> {
  return {
    Authorization: `Bearer ${JWT_TOKEN}`,
    ...headers,
  };
}
