/** Where a user lands after login: admins go to the admin portal, users to their dashboard. */
export const homePathFor = (user) => (user?.role === "admin" ? "/admin" : "/dashboard")
