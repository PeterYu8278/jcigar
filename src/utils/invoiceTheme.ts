/**
 * Shared theme configuration for Invoice PDF and Web Preview
 * Ensuring consistent branding across all invoice formats.
 */

export const INVOICE_COLORS = {
  primary: {
    rgb: [30, 41, 59],
    hex: '#1E293B' // Deep Navy/Slate
  },
  secondary: {
    rgb: [203, 161, 53],
    hex: '#CBA135' // Business Gold
  },
  textMain: {
    rgb: [30, 41, 59],
    hex: '#1E293B'
  },
  textSecondary: {
    rgb: [100, 114, 139],
    hex: '#64728B'
  },
  lightGray: {
    rgb: [248, 250, 252],
    hex: '#F8FAFC'
  },
  borderGray: {
    rgb: [226, 232, 240],
    hex: '#E2E8F0'
  },
  white: {
    rgb: [255, 255, 255],
    hex: '#FFFFFF'
  },
  slateLight: {
    rgb: [203, 213, 225],
    hex: '#CBD5E1'
  }
}

export const INVOICE_LAYOUT = {
  margin: 15,
  headerHeight: 25,
  titleGap: 7,        // baseline offset from header
  sectionGap: 8,
  metaRowHeight: 2.8,
  tablePadding: 10
}
