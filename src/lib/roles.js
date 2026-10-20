// Nombres de los roles de memberships para mostrarlos en la interfaz
export const ROLE_LABEL = {
  owner: "Dueño",
  admin: "Administrador",
  member: "Miembro",
  accountant: "Gestor (solo lectura)",
};

// Pueden cambiar los datos del negocio (nombre, facturación…)
export const canManageOrg = (role) => role === "owner" || role === "admin";
