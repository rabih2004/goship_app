/**
 * Role-aware nav links. Defined once here, consumed by both desktop Header
 * and MobileNav drawer so they never diverge.
 *
 * Labels are translation KEYS — caller resolves via t() with namespace "Header".
 */
import type { UserRole } from "@prisma/client";

export type NavLink = {
  href: string;
  labelKey: string; // e.g. "navRfqs" — resolved against the "Header" namespace
};

export function navLinksForRole(role: UserRole): NavLink[] {
  switch (role) {
    case "CUSTOMER":
      return [
        { href: "/customer/shipments", labelKey: "navShipments" },
        { href: "/customer/bookings", labelKey: "navBookings" },
      ];
    case "FORWARDER":
      return [
        { href: "/forwarder/rfq", labelKey: "navRfqs" },
        { href: "/forwarder/lanes", labelKey: "navLanes" },
        { href: "/forwarder/ports", labelKey: "navPorts" },
        { href: "/forwarder/bookings", labelKey: "navBookings" },
      ];
    case "COWORKER":
      return [
        { href: "/coworker/rfq", labelKey: "navRfqs" },
        { href: "/coworker/bookings", labelKey: "navBookings" },
      ];
    case "CUSTOMS_AGENT":
      return [
        { href: "/customs/rfq", labelKey: "navRfqs" },
        { href: "/customs/bookings", labelKey: "navBookings" },
      ];
    case "ADMIN":
      return [
        { href: "/admin/users", labelKey: "navUsers" },
        { href: "/admin/shipments", labelKey: "navShipments" },
        { href: "/admin/bookings", labelKey: "navBookings" },
        { href: "/admin/disputes", labelKey: "navDisputes" },
        { href: "/admin/ports", labelKey: "navPorts" },
      ];
  }
}

export function dashboardHrefForRole(role: UserRole): string {
  switch (role) {
    case "CUSTOMER":
      return "/customer";
    case "FORWARDER":
      return "/forwarder";
    case "COWORKER":
      return "/coworker";
    case "CUSTOMS_AGENT":
      return "/customs";
    case "ADMIN":
      return "/admin";
  }
}

/** Role-specific profile-page route. */
export function profileHrefForRole(role: UserRole): string {
  switch (role) {
    case "CUSTOMER":
      return "/customer/profile";
    case "FORWARDER":
      return "/forwarder/profile";
    case "COWORKER":
      return "/coworker/profile";
    case "CUSTOMS_AGENT":
      return "/customs/profile";
    case "ADMIN":
      return "/admin/profile";
  }
}
