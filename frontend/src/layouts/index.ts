/**
 * Layout Components Export
 *
 * This module exports all layout components used throughout the application.
 *
 * Layout Hierarchy:
 *
 * RootLayout
 * ├── MainLayout (for public pages with Navbar/Footer)
 * │   ├── HomePage
 * │   ├── RestaurantsPage
 * │   └── ...other public pages
 * │
 * └── AuthLayout (for authentication pages)
 *     ├── LoginPage
 *     ├── RegisterPage
 *     ├── ForgotPasswordPage
 *     └── VerifyEmailPage
 */

export { default as RootLayout } from "./RootLayout";
export { default as MainLayout } from "./MainLayout";
export { default as AuthLayout } from "./AuthLayout";
export { default as AccountLayout } from "./AccountLayout";
