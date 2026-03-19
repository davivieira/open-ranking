import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const A4_MM_WIDTH = 210;
const A4_MM_HEIGHT = 297;

export type ExportPagesToPdfOptions = {
  backgroundColor?: string;
};

/**
 * Capture multiple page elements and download as a multi-page PDF.
 * Each element is captured at its current size and drawn on one A4 page at full size (no scaling).
 * Page elements should be pre-sized to A4 pixels (e.g. 794×1123 at 96dpi) for 1:1 output.
 *
 * @param pageElements - Array of DOM elements, one per page (e.g. leaderboard pages with 10 rows each)
 * @param filename - Filename for the download (without .pdf)
 * @param options - Optional backgroundColor (default #1C1130)
 */
export async function exportPagesToPdf(
  pageElements: HTMLElement[],
  filename: string,
  options: ExportPagesToPdfOptions = {},
): Promise<void> {
  const backgroundColor = options.backgroundColor ?? "#1C1130";
  const pdf = new jsPDF("p", "mm", "a4");

  for (let i = 0; i < pageElements.length; i++) {
    if (i > 0) {
      pdf.addPage();
    }
    const canvas = await html2canvas(pageElements[i], {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor,
    });
    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", 0, 0, A4_MM_WIDTH, A4_MM_HEIGHT);
  }

  pdf.save(`${filename}.pdf`);
}

/**
 * Capture an HTML element and download it as a PDF (single page).
 * @param element - The DOM element to capture (e.g. a div wrapping the leaderboard table)
 * @param filename - Suggested filename for the download (without .pdf)
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string = "export",
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#2A1743",
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgW = canvas.width;
  const imgH = canvas.height;
  // Fill the page width and anchor content to the top to avoid large
  // empty margins above/below the leaderboard.
  const ratio = pdfWidth / imgW;
  const w = imgW * ratio;
  const h = imgH * ratio;
  const x = (pdfWidth - w) / 2;
  const y = 0;
  pdf.addImage(imgData, "PNG", x, y, w, Math.min(h, pdfHeight));
  pdf.save(`${filename}.pdf`);
}
