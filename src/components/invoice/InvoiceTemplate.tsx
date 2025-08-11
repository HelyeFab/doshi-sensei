'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font, PDFViewer } from '@react-pdf/renderer';

// Define pastel color palette
const colors = {
  primary: '#A8DADC',      // Soft teal
  secondary: '#FFD6E8',     // Soft pink
  accent: '#F1E5AC',        // Soft yellow
  background: '#FFF9F5',    // Cream white
  text: '#2D3748',          // Dark gray
  lightText: '#718096',     // Medium gray
  border: '#E8D5B7',        // Soft beige
  success: '#B2E1D4',       // Soft green
  tableBg: '#FFEFD5',       // Papaya whip
  tableAlt: '#F5F5DC',      // Beige
};

// Register fonts (using web fonts for now, can be replaced with local fonts)
Font.register({
  family: 'Rubik',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/rubik/v28/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-B4i1UA.ttf', fontWeight: 400, fontStyle: 'normal' },
    { src: 'https://fonts.gstatic.com/s/rubik/v28/iJWbBXyIfDnIV7nEt3KSJbVDV49rz8sDE0Uw.ttf', fontWeight: 500, fontStyle: 'normal' },
    { src: 'https://fonts.gstatic.com/s/rubik/v28/iJWbBXyIfDnIV7nEt3KSJbVDV49rz8tdFkUw.ttf', fontWeight: 600, fontStyle: 'normal' },
    { src: 'https://fonts.gstatic.com/s/rubik/v28/iJWbBXyIfDnIV7nEt3KSJbVDV49rz8s6FkUw.ttf', fontWeight: 700, fontStyle: 'normal' },
    // Add italic variant for regular weight
    { src: 'https://fonts.gstatic.com/s/rubik/v28/iJWXBXyIfDnIV7nBrXyw823e.ttf', fontWeight: 400, fontStyle: 'italic' },
  ]
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Rubik',
    backgroundColor: colors.background,
    padding: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: `2px solid ${colors.border}`,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 15,
  },
  companyInfo: {
    justifyContent: 'center',
  },
  companyName: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.text,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 11,
    color: colors.lightText,
    fontWeight: 400,
  },
  invoiceTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.primary,
    textAlign: 'right',
  },
  invoiceNumber: {
    fontSize: 10,
    color: colors.lightText,
    textAlign: 'right',
    marginTop: 4,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  infoBox: {
    flex: 1,
    padding: 15,
    backgroundColor: colors.tableBg,
    borderRadius: 8,
    marginRight: 10,
  },
  infoBoxLast: {
    flex: 1,
    padding: 15,
    backgroundColor: colors.tableBg,
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 10,
    color: colors.lightText,
    marginBottom: 4,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 2,
  },
  table: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: 600,
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottom: `1px solid ${colors.border}`,
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.tableAlt,
    borderBottom: `1px solid ${colors.border}`,
  },
  tableCell: {
    fontSize: 11,
    color: colors.text,
  },
  descriptionColumn: {
    flex: 3,
  },
  quantityColumn: {
    flex: 1,
    textAlign: 'center',
  },
  priceColumn: {
    flex: 1,
    textAlign: 'right',
  },
  amountColumn: {
    flex: 1,
    textAlign: 'right',
  },
  totalsSection: {
    marginLeft: 'auto',
    width: 250,
    marginBottom: 30,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    borderBottom: `1px solid ${colors.border}`,
  },
  totalLabel: {
    fontSize: 11,
    color: colors.lightText,
  },
  totalValue: {
    fontSize: 11,
    color: colors.text,
    fontWeight: 500,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: colors.success,
    borderRadius: 8,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.text,
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.text,
  },
  paymentStatus: {
    padding: 15,
    backgroundColor: colors.success,
    borderRadius: 8,
    marginBottom: 30,
    alignItems: 'center',
  },
  paymentStatusText: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.text,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
    borderTop: `1px solid ${colors.border}`,
  },
  footerText: {
    fontSize: 10,
    color: colors.lightText,
    textAlign: 'center',
    marginBottom: 4,
  },
  thankYou: {
    fontSize: 16,
    fontWeight: 600,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  notes: {
    padding: 15,
    backgroundColor: colors.accent,
    borderRadius: 8,
    marginBottom: 20,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.text,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 10,
    color: colors.text,
    lineHeight: 1.4,
  },
});

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  customerName: string;
  customerEmail: string;
  customerAddress?: string;
  items: Array<{
    description: string;
    quantity: number;
    price: number;
    amount: number;
  }>;
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  currency: string;
  paymentStatus: 'paid' | 'pending' | 'failed';
  paymentMethod?: string;
  notes?: string;
}

interface InvoiceTemplateProps {
  data: InvoiceData;
  logoUrl?: string;
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ data, logoUrl = '/doshi.png' }) => {
  const formatCurrency = (amount: number) => {
    const currencySymbol = data.currency === 'usd' ? '$' : 
                           data.currency === 'eur' ? '€' : 
                           data.currency === 'gbp' ? '£' : 
                           data.currency === 'jpy' ? '¥' : '$';
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Image style={styles.logo} src={logoUrl} />
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>Doshi Sensei</Text>
              <Text style={styles.tagline}>Your Japanese Learning Companion</Text>
            </View>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{data.invoiceNumber}</Text>
          </View>
        </View>

        {/* Customer and Invoice Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Bill To</Text>
            <Text style={styles.infoValue}>{data.customerName}</Text>
            <Text style={styles.infoValue}>{data.customerEmail}</Text>
            {data.customerAddress && (
              <Text style={styles.infoValue}>{data.customerAddress}</Text>
            )}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Invoice Date</Text>
            <Text style={styles.infoValue}>{formatDate(data.invoiceDate)}</Text>
            {data.dueDate && (
              <>
                <Text style={[styles.infoLabel, { marginTop: 8 }]}>Due Date</Text>
                <Text style={styles.infoValue}>{formatDate(data.dueDate)}</Text>
              </>
            )}
          </View>
          <View style={styles.infoBoxLast}>
            <Text style={styles.infoLabel}>Payment Status</Text>
            <Text style={[styles.infoValue, { fontWeight: 600, color: data.paymentStatus === 'paid' ? '#4CAF50' : colors.text }]}>
              {data.paymentStatus.toUpperCase()}
            </Text>
            {data.paymentMethod && (
              <>
                <Text style={[styles.infoLabel, { marginTop: 8 }]}>Payment Method</Text>
                <Text style={styles.infoValue}>{data.paymentMethod}</Text>
              </>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.descriptionColumn]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.quantityColumn]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.priceColumn]}>Price</Text>
            <Text style={[styles.tableHeaderText, styles.amountColumn]}>Amount</Text>
          </View>
          {data.items.map((item, index) => (
            <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, styles.descriptionColumn]}>{item.description}</Text>
              <Text style={[styles.tableCell, styles.quantityColumn]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.priceColumn]}>{formatCurrency(item.price)}</Text>
              <Text style={[styles.tableCell, styles.amountColumn]}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(data.subtotal)}</Text>
          </View>
          {data.tax && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.tax)}</Text>
            </View>
          )}
          {data.discount && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>-{formatCurrency(data.discount)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(data.total)}</Text>
          </View>
        </View>

        {/* Payment Status Banner */}
        {data.paymentStatus === 'paid' && (
          <View style={styles.paymentStatus}>
            <Text style={styles.paymentStatusText}>✓ Payment Received - Thank You!</Text>
          </View>
        )}

        {/* Notes */}
        {data.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Thank You Message */}
        <Text style={styles.thankYou}>ありがとうございます！Thank you for your subscription!</Text>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Doshi Sensei - Learn Japanese with Confidence</Text>
          <Text style={styles.footerText}>support@doshisensei.com | www.doshisensei.com</Text>
          <Text style={styles.footerText}>This is an automatically generated invoice</Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoiceTemplate;

// Export a viewer component for development/testing
export const InvoiceViewer: React.FC<InvoiceTemplateProps> = (props) => {
  return (
    <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
      <InvoiceTemplate {...props} />
    </PDFViewer>
  );
};