export function clearSessionCache() {
  [
    "auth",
    "authUser",
    "authAt",
    "authEmail",
    "authPicture",
    "authRole",
    "authRoles",
    "accessToken",
    "authToken",
    "token",
    "jwt",
  ].forEach((key) => localStorage.removeItem(key));
}

export function writeSafeSessionCache(user = {}) {
  const roles = Array.isArray(user.roles) ? user.roles.map(String) : [];
  const primaryRole =
    ["super_admin", "admin", "teacher", "pending", "student", "user"].find((role) =>
      roles.includes(role)
    ) || roles[0] || "student";

  localStorage.setItem("authUser", user.name || "User");
  localStorage.setItem("authEmail", user.email || "");
  localStorage.setItem("authRole", primaryRole);
  localStorage.setItem("authRoles", JSON.stringify(roles));
  if (user.picture) localStorage.setItem("authPicture", user.picture);
  localStorage.removeItem("auth");
}
