import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

import type { DonationReceipt } from './entities/donation-receipt.entity.js';

const PAGE_MARGIN = 50;
const LABEL_WIDTH = 170;

/**
 * Renders custody certificates as files a recipient can file with a funder.
 *
 * Both apps had a Download button wired to nothing, which for a document whose
 * whole purpose is grant reporting made the feature decorative.
 */
@Injectable()
export class ReceiptExportService {
  /**
   * Renders one certificate as a single-page PDF.
   * @param receipt The certificate to render.
   * @returns A Promise that resolves with the PDF bytes.
   */
  async toPdf(receipt: DonationReceipt): Promise<Buffer> {
    const document = new PDFDocument({
      size: 'A4',
      margin: PAGE_MARGIN,
      info: {
        Title: `Spira custody certificate ${receipt.receiptNumber}`,
        Author: 'Spira',
      },
    });

    const chunks: Buffer[] = [];

    document.on('data', (chunk: Buffer) => chunks.push(chunk));

    const finished = new Promise<Buffer>((resolve, reject) => {
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
    });

    this.writePdfBody(document, receipt);
    document.end();

    return await finished;
  }

  /**
   * Renders several certificates as one CSV, one row each.
   *
   * Every field is quoted and embedded quotes are doubled, so a store name with
   * a comma in it cannot shift the columns of a funder's spreadsheet.
   * @param receipts The certificates to render.
   * @returns The CSV text, including its header row.
   */
  toCsv(receipts: DonationReceipt[]): string {
    const columns: [string, (receipt: DonationReceipt) => string][] = [
      ['Receipt number', (receipt) => receipt.receiptNumber],
      ['Issued at', (receipt) => receipt.issuedAt.toISOString()],
      ['Donor', (receipt) => receipt.retailerLegalName],
      ['Donor tax ID', (receipt) => receipt.retailerTaxId ?? ''],
      ['Branch', (receipt) => receipt.locationLabel],
      ['Branch address', (receipt) => receipt.locationAddress],
      ['Recipient', (receipt) => receipt.recipientLegalName],
      ['Recipient tax ID', (receipt) => receipt.recipientTaxId ?? ''],
      ['Authorised by', (receipt) => receipt.authorizedByName],
      ['Received by', (receipt) => receipt.receivedByLabel ?? ''],
      ['Driver', (receipt) => receipt.driverName ?? ''],
      ['Vehicle', (receipt) => receipt.vehiclePlate ?? ''],
      ['Lines', (receipt) => String(receipt.lineCount)],
      ['Units', (receipt) => String(receipt.totalQuantity)],
      ['Weight (kg)', (receipt) => String(receipt.totalWeightKg)],
      ['Retail value', (receipt) => String(receipt.totalRetailValue ?? '')],
      ['Currency', (receipt) => receipt.currency],
      ['Meals', (receipt) => String(receipt.estimatedMeals ?? '')],
      ['CO2 avoided (kg)', (receipt) => String(receipt.co2AvoidedKg ?? '')],
      ['Handover PIN', (receipt) => receipt.handoverPin ?? ''],
      ['Verification code', (receipt) => receipt.verificationCode ?? ''],
      ['Legal reference', (receipt) => receipt.legalReference ?? ''],
    ];

    const escape = (value: string): string =>
      `"${value.replaceAll('"', '""')}"`;

    return [
      columns.map(([header]) => escape(header)).join(','),
      ...receipts.map((receipt) =>
        columns.map(([, read]) => escape(read(receipt))).join(','),
      ),
    ].join('\r\n');
  }

  /**
   * Writes the certificate's content onto an open PDF document.
   * @param document The document to write into.
   * @param receipt The certificate being rendered.
   */
  private writePdfBody(
    document: PDFKit.PDFDocument,
    receipt: DonationReceipt,
  ): void {
    document
      .fontSize(20)
      .text('Food Donation Custody Certificate', { align: 'center' })
      .moveDown(0.3)
      .fontSize(10)
      .text(`Certificate ${receipt.receiptNumber}`, { align: 'center' })
      .text(`Issued ${receipt.issuedAt.toISOString()}`, { align: 'center' })
      .moveDown(1.5);

    this.writeSection(document, 'Donor', [
      ['Organization', receipt.retailerLegalName],
      ['Tax identifier', receipt.retailerTaxId ?? '—'],
      ['Branch', receipt.locationLabel],
      ['Branch code', receipt.locationCode ?? '—'],
      ['Address', receipt.locationAddress],
      ['Authorised by', receipt.authorizedByName],
    ]);

    this.writeSection(document, 'Recipient', [
      ['Organization', receipt.recipientLegalName],
      ['Tax identifier', receipt.recipientTaxId ?? '—'],
      ['Collected by', receipt.driverName ?? '—'],
      ['Signed for by', receipt.receivedByLabel ?? '—'],
      ['Vehicle', receipt.vehiclePlate ?? '—'],
    ]);

    this.writeSection(document, 'Goods transferred', [
      ['Lines', String(receipt.lineCount)],
      ['Units', String(receipt.totalQuantity)],
      ['Weight', `${receipt.totalWeightKg} kg`],
      [
        'Retail value',
        receipt.totalRetailValue === null
          ? '—'
          : `${receipt.totalRetailValue} ${receipt.currency}`,
      ],
    ]);

    this.writeSection(document, 'Impact', [
      ['Meals provided', String(receipt.estimatedMeals ?? '—')],
      [
        'CO₂-equivalent avoided',
        receipt.co2AvoidedKg === null ? '—' : `${receipt.co2AvoidedKg} kg`,
      ],
    ]);

    this.writeSection(document, 'Verification', [
      ['Handover PIN', receipt.handoverPin ?? '—'],
      ['Verification code', receipt.verificationCode ?? '—'],
      ['Legal reference', receipt.legalReference ?? '—'],
    ]);

    document
      .moveDown(1)
      .fontSize(8)
      .text(
        'This certificate records a transfer of custody of food goods. Figures are frozen at issue and are not restated if platform factors change.',
        { align: 'left' },
      );
  }

  /**
   * Writes one labelled block of rows.
   * @param document The document to write into.
   * @param title The block heading.
   * @param rows The label/value pairs to print.
   */
  private writeSection(
    document: PDFKit.PDFDocument,
    title: string,
    rows: [string, string][],
  ): void {
    document.fontSize(13).text(title).moveDown(0.3).fontSize(10);

    for (const [label, value] of rows) {
      const top = document.y;

      document.text(`${label}:`, PAGE_MARGIN, top, { width: LABEL_WIDTH });
      document.text(value, PAGE_MARGIN + LABEL_WIDTH, top, {
        width: document.page.width - PAGE_MARGIN * 2 - LABEL_WIDTH,
      });
    }

    document.moveDown(1);
  }
}
