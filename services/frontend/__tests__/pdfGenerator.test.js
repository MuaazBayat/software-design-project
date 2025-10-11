// Mock jsPDF
jest.mock('jspdf', () => {
  const mockJsPDF = jest.fn((options) => ({
    setFont: jest.fn(),
    setFontSize: jest.fn(),
    text: jest.fn(),
    splitTextToSize: jest.fn().mockReturnValue(['line 1', 'line 2']),
    addImage: jest.fn(),
    internal: {
      pageSize: {
        getWidth: jest.fn().mockReturnValue(612),
        getHeight: jest.fn().mockReturnValue(792),
      },
    },
    output: jest.fn().mockReturnValue(new Blob()),
  }));

  return {
    __esModule: true,
    default: mockJsPDF,
  };
});

// Mock html2canvas
jest.mock('html2canvas', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock html-to-image
jest.mock('html-to-image', () => ({
  toPng: jest.fn(),
}));

// Mock the jpegGenerator functions
jest.mock('../app/compose-letter/lib/jpegGenerator', () => ({
  captureLetterCloneAsPng: jest.fn(),
  adjustFontSizeForExport: jest.fn(),
}));

// Import after mocks
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import { PDFGenerator, LetterPDFData } from '../app/compose-letter/lib/pdfGenerator';

describe('pdfGenerator', () => {
  let mockElement;
  let captureLetterCloneAsPng;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock document methods to avoid real DOM operations
    const mockCreateElement = jest.fn().mockReturnValue({
      style: {},
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      parentNode: null,
      querySelectorAll: jest.fn().mockReturnValue([]),
    });
    document.createElement = mockCreateElement;

    // Mock document.body methods
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();

    // Create a mock DOM element that behaves like an HTMLElement
    mockElement = {
      offsetWidth: 800,
      offsetHeight: 600,
      cloneNode: jest.fn().mockReturnValue(document.createElement('div')), // Return real DOM element
      ownerDocument: {
        defaultView: window,
      },
    };

    // Setup mocks
    const jpegGenerator = require('../app/compose-letter/lib/jpegGenerator');
    captureLetterCloneAsPng = jpegGenerator.captureLetterCloneAsPng;
    captureLetterCloneAsPng.mockResolvedValue({
      dataUrl: 'data:image/png;base64,mockData',
      scalingFactor: 1.2,
    });

    // Mock adjustFontSizeForExport to avoid DOM manipulation
    jpegGenerator.adjustFontSizeForExport.mockReturnValue({
      cleanup: jest.fn(),
      scalingFactor: 1.0,
    });

    // Mock toPng to avoid canvas operations
    toPng.mockResolvedValue('data:image/png;base64,mockPngData');
  });

  describe('PDFGenerator.generateLetterPDF', () => {
    let mockData;

    beforeEach(() => {
      mockData = {
        content: 'Test content',
        heading: 'Test Heading',
        footer: 'Test Footer',
        anonymousHandle: 'Anonymous',
        date: '2024-01-01',
        fontSize: 12,
        fontFamily: 'Arial',
      };
    });

    test('should generate PDF from element', async () => {
      const result = await PDFGenerator.generateLetterPDF(mockElement, mockData);

      expect(captureLetterCloneAsPng).toHaveBeenCalledWith(mockElement, 768, undefined, { isMobile: false });
      expect(jsPDF).toHaveBeenCalledWith({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter',
      });
      expect(result).toBeInstanceOf(Blob);
    });

    test('should handle mobile layout', async () => {
      const result = await PDFGenerator.generateLetterPDF(mockElement, mockData, 768, true);

      expect(captureLetterCloneAsPng).toHaveBeenCalledWith(mockElement, 768, undefined, { isMobile: true });
    });

    test('should use custom target width', async () => {
      const result = await PDFGenerator.generateLetterPDF(mockElement, mockData, 1024);

      expect(captureLetterCloneAsPng).toHaveBeenCalledWith(mockElement, 1024, undefined, { isMobile: false });
    });

    test('should add image to PDF with correct dimensions', async () => {
      const mockPdf = {
        internal: {
          pageSize: {
            getWidth: jest.fn().mockReturnValue(612),
            getHeight: jest.fn().mockReturnValue(792),
          },
        },
        addImage: jest.fn(),
        output: jest.fn().mockReturnValue(new Blob()),
      };

      jsPDF.mockReturnValue(mockPdf);

      await PDFGenerator.generateLetterPDF(mockElement, mockData);

      expect(mockPdf.addImage).toHaveBeenCalledWith(
        'data:image/png;base64,mockData',
        'PNG',
        0,
        0,
        612,
        792
      );
    });

    test('should handle captureLetterCloneAsPng errors', async () => {
      captureLetterCloneAsPng.mockRejectedValue(new Error('Capture failed'));

      await expect(PDFGenerator.generateLetterPDF(mockElement, mockData)).rejects.toThrow('Capture failed');
    });
  });

  describe('PDFGenerator.generateLetterPDFDirect', () => {
    let mockData;

    beforeEach(() => {
      mockData = {
        content: 'Test content for PDF generation',
        heading: 'Test Heading',
        footer: 'Test Footer',
        anonymousHandle: 'Anonymous User',
        date: '2024-01-01',
        fontSize: 12,
        fontFamily: 'Arial',
        templateBackground: '#ffffff',
        templateImageUrl: 'http://example.com/image.png',
      };
    });

    test('should generate PDF directly from data', async () => {
      const mockPdf = {
        setFont: jest.fn(),
        setFontSize: jest.fn(),
        text: jest.fn(),
        splitTextToSize: jest.fn().mockReturnValue(['line 1', 'line 2']),
        output: jest.fn().mockReturnValue(new Blob()),
      };

      jsPDF.mockReturnValue(mockPdf);

      const result = await PDFGenerator.generateLetterPDFDirect(mockData);

      expect(jsPDF).toHaveBeenCalledWith({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      expect(result).toBeInstanceOf(Blob);
    });

    test('should set font and add text elements', async () => {
      const mockPdf = {
        setFont: jest.fn(),
        setFontSize: jest.fn(),
        text: jest.fn(),
        splitTextToSize: jest.fn().mockReturnValue(['line 1', 'line 2']),
        output: jest.fn().mockReturnValue(new Blob()),
      };

      jsPDF.mockReturnValue(mockPdf);

      await PDFGenerator.generateLetterPDFDirect(mockData);

      expect(mockPdf.setFont).toHaveBeenCalledWith('helvetica', 'normal');
      expect(mockPdf.setFontSize).toHaveBeenCalledTimes(4); // date, heading, content, footer
      expect(mockPdf.text).toHaveBeenCalledTimes(5); // date, heading, content, footer, handle
    });

    test('should add date at correct position', async () => {
      const mockPdf = {
        setFont: jest.fn(),
        setFontSize: jest.fn(),
        text: jest.fn(),
        splitTextToSize: jest.fn().mockReturnValue(['line 1', 'line 2']),
        output: jest.fn().mockReturnValue(new Blob()),
      };

      jsPDF.mockReturnValue(mockPdf);

      await PDFGenerator.generateLetterPDFDirect(mockData);

      expect(mockPdf.setFontSize).toHaveBeenCalledWith(10);
      expect(mockPdf.text).toHaveBeenCalledWith('2024-01-01', 20, 30);
    });

    test('should add heading with correct font size', async () => {
      const mockPdf = {
        setFont: jest.fn(),
        setFontSize: jest.fn(),
        text: jest.fn(),
        splitTextToSize: jest.fn().mockReturnValue(['line 1', 'line 2']),
        output: jest.fn().mockReturnValue(new Blob()),
      };

      jsPDF.mockReturnValue(mockPdf);

      await PDFGenerator.generateLetterPDFDirect(mockData);

      expect(mockPdf.setFontSize).toHaveBeenCalledWith(14);
      expect(mockPdf.text).toHaveBeenCalledWith('Test Heading', 20, 50);
    });

    test('should add content with custom font size', async () => {
      const mockPdf = {
        setFont: jest.fn(),
        setFontSize: jest.fn(),
        text: jest.fn(),
        splitTextToSize: jest.fn().mockReturnValue(['line 1', 'line 2']),
        output: jest.fn().mockReturnValue(new Blob()),
      };

      jsPDF.mockReturnValue(mockPdf);

      await PDFGenerator.generateLetterPDFDirect(mockData);

      expect(mockPdf.setFontSize).toHaveBeenCalledWith(12);
      expect(mockPdf.splitTextToSize).toHaveBeenCalledWith('Test content for PDF generation', 170); // 210 - 40
      expect(mockPdf.text).toHaveBeenCalledWith(['line 1', 'line 2'], 20, 70);
    });

    test('should add footer and anonymous handle', async () => {
      const mockPdf = {
        setFont: jest.fn(),
        setFontSize: jest.fn(),
        text: jest.fn(),
        splitTextToSize: jest.fn().mockReturnValue(['line 1', 'line 2']),
        output: jest.fn().mockReturnValue(new Blob()),
      };

      jsPDF.mockReturnValue(mockPdf);

      await PDFGenerator.generateLetterPDFDirect(mockData);

      expect(mockPdf.setFontSize).toHaveBeenCalledWith(12);
      expect(mockPdf.text).toHaveBeenCalledWith('Test Footer', 20, 297 - 20 - 20); // footerY
      expect(mockPdf.text).toHaveBeenCalledWith('Anonymous User', 20, 297 - 20 - 20 + 10); // footerY + 10
    });

    test('should handle jsPDF errors', async () => {
      jsPDF.mockImplementation(() => {
        throw new Error('PDF creation failed');
      });

      await expect(PDFGenerator.generateLetterPDFDirect(mockData)).rejects.toThrow('PDF creation failed');
    });
  });

  describe('PDFGenerator.downloadPDF', () => {
    let mockBlob;
    let mockUrl;
    let mockLink;

    beforeEach(() => {
      mockBlob = new Blob(['test'], { type: 'application/pdf' });
      mockUrl = 'blob:test-url';
      mockLink = {
        href: '',
        download: '',
        click: jest.fn(),
      };

      // Mock URL.createObjectURL and revokeObjectURL
      global.URL.createObjectURL = jest.fn().mockReturnValue(mockUrl);
      global.URL.revokeObjectURL = jest.fn();

      // Mock document.createElement and body methods
      document.createElement = jest.fn().mockReturnValue(mockLink);
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();
    });

    test('should create download link and trigger download', () => {
      PDFGenerator.downloadPDF(mockBlob, 'test.pdf');

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe(mockUrl);
      expect(mockLink.download).toBe('test.pdf');
      expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
    });

    test('should use default filename when not provided', () => {
      PDFGenerator.downloadPDF(mockBlob);

      expect(mockLink.download).toBe('letter.pdf');
    });

    test('should handle different blob types', () => {
      const textBlob = new Blob(['test content'], { type: 'text/plain' });

      PDFGenerator.downloadPDF(textBlob, 'test.txt');

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(textBlob);
      expect(mockLink.download).toBe('test.txt');
    });
  });

  describe('LetterPDFData interface', () => {
    test('should accept valid LetterPDFData object', () => {
      const validData = {
        content: 'Test content',
        heading: 'Test Heading',
        footer: 'Test Footer',
        anonymousHandle: 'Anonymous',
        date: '2024-01-01',
        fontSize: 12,
        fontFamily: 'Arial',
        templateBackground: '#ffffff',
        templateImageUrl: 'http://example.com/image.png',
      };

      expect(validData).toHaveProperty('content');
      expect(validData).toHaveProperty('heading');
      expect(validData).toHaveProperty('footer');
      expect(validData).toHaveProperty('anonymousHandle');
      expect(validData).toHaveProperty('date');
      expect(validData).toHaveProperty('fontSize');
      expect(validData).toHaveProperty('fontFamily');
    });

    test('should handle optional template properties', () => {
      const minimalData = {
        content: 'Test content',
        heading: 'Test Heading',
        footer: 'Test Footer',
        anonymousHandle: 'Anonymous',
        date: '2024-01-01',
        fontSize: 12,
        fontFamily: 'Arial',
      };

      expect(minimalData).not.toHaveProperty('templateBackground');
      expect(minimalData).not.toHaveProperty('templateImageUrl');
    });
  });
});