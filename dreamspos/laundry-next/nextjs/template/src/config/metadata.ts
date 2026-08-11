// src/config/metadata.ts
import { Metadata } from "next";

export const getPageMetadata = (pageName: string): Metadata => {
  const baseTitle = `${pageName} | Dreams Timer - Time Tracking Bootstrap 5 Admin Dashboard`;

  // Default metadata that applies to all pages
  const baseMetadata: Metadata = {
    title: baseTitle,
    description: "Dreams Timer - Time Tracking Bootstrap 5 Admin Dashboard",
    keywords: "time tracking, dashboard, admin template, bootstrap 5",
    authors: [{ name: "Dreams Technologies" }],
    icons: {
      icon: [
        { url: "favicon.png", sizes: "16x16", type: "image/png" },
        { url: "favicon.png", sizes: "32x32", type: "image/png" },
        { url: "favicon.png", sizes: "any" },
      ],
      apple: [
        { url: "apple-icon.png", sizes: "180x180" },
      ],
    },
  };

  // Page-specific metadata overrides
  const pageMetadata: Record<string, Partial<Metadata>> = {
    login: {
      description:
        "Sign in to your Dreams Timer account to track your time and manage projects",
    },
    dashboard: {
      description:
        "View and manage your time tracking dashboard with detailed analytics",
    },
    // Add more pages as needed
  };

  // Get the specific metadata for the page, or empty object if not found
  const specificMetadata = pageMetadata[pageName.toLowerCase()] || {};

  // Merge base metadata with specific page metadata
  return {
    ...baseMetadata,
    ...specificMetadata,
    // Ensure title is always set correctly
    title: baseTitle,
  };
};
