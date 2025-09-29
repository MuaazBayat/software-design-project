import jsPDF from 'jspdf';
import { captureLetterCloneAsPng, adjustFontSizeForExport } from './jpegGenerator';

export interface LetterPDFData {
  content: string;
  heading: string;
  footer: string;
  anonymousHandle: string;
  date: string;
  fontSize: number;
  fontFamily: string;
  templateBackground?: string;
  templateImageUrl?: string;
}

export class PDFGenerator {
  static async generateLetterPDF(
    element: HTMLElement,
    data: LetterPDFData,
    targetWidth: number = 768,
    isMobile: boolean = false
  ): Promise<Blob> {
    const imgData = await captureLetterCloneAsPng(element, targetWidth, undefined, { isMobile });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData.dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);

    return pdf.output('blob');
  }

  static async generateLetterPDFDirect(data: LetterPDFData): Promise<Blob> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // A4 dimensions in mm
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;

    // Set font
    pdf.setFont('helvetica', 'normal');

    // Add date
    pdf.setFontSize(10);
    pdf.text(data.date, margin, margin + 10);

    // Add heading
    pdf.setFontSize(14);
    pdf.text(data.heading, margin, margin + 30);

    // Add main content
    pdf.setFontSize(data.fontSize);
    const contentLines = pdf.splitTextToSize(data.content, pageWidth - (margin * 2));
    pdf.text(contentLines, margin, margin + 50);

    // Add footer
    const footerY = pageHeight - margin - 20;
    pdf.setFontSize(12);
    pdf.text(data.footer, margin, footerY);
    pdf.text(data.anonymousHandle, margin, footerY + 10);

    return pdf.output('blob');
  }

  static downloadPDF(blob: Blob, filename: string = 'letter.pdf') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}